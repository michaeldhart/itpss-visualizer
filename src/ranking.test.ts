import { describe, expect, it } from "vitest";
import { blackRatio, combinedRatio, defaultOptions, explainExclusion, hispanicRatio, lowEnd, methodLabel, parseView, rankDepartments, RankingOptions, toQuery } from "./ranking";
import { RankingRow } from "./types";

const row = (name: string, white: [number, number], black: [number, number], hispanic: [number, number], extra: Partial<RankingRow> = {}): RankingRow => ({
    id: name.toLowerCase().replace(/\W+/g, "-"), name, kind: "police",
    white: { stops: white[0], benchmark: white[1] }, black: { stops: black[0], benchmark: black[1] }, hispanic: { stops: hispanic[0], benchmark: hispanic[1] }, ...extra
});

// White 100 stops of 1,000 people (0.1); Black 60 of 100 (0.6, ratio 6); Hispanic 40 of 400 (0.1, ratio 1)
const sample = row("Sample Police", [100, 1000], [60, 100], [40, 400]);

describe("ratios", () => {
    it("works out each group's rate relative to White drivers", () => {
        expect(blackRatio(sample)).toBeCloseTo(6);
        expect(hispanicRatio(sample)).toBeCloseTo(1);
    });

    it("combines Black and Hispanic as one group", () => {
        // (60 + 40) stops / (100 + 400) people = 0.2, over White's 0.1
        expect(combinedRatio(sample)).toBeCloseTo(2);
    });

    it("is the average of the two group ratios, weighted by their populations", () => {
        const weighted = (100 * blackRatio(sample)! + 400 * hispanicRatio(sample)!) / 500;
        expect(combinedRatio(sample)).toBeCloseTo(weighted);
    });

    it("has no ratio without White stops or a benchmark", () => {
        expect(combinedRatio(row("A", [0, 1000], [5, 100], [5, 100]))).toBeNull();
        expect(combinedRatio(row("B", [10, 0], [5, 100], [5, 100]))).toBeNull();
        expect(combinedRatio(row("C", [10, 1000], [5, 0], [5, 0]))).toBeNull();
    });
});

describe("lowEnd", () => {
    const withIntervals = { ...sample, blackRatioInterval: [4, 8] as [number, number], hispanicRatioInterval: [0.5, 2] as [number, number] };

    it("averages the two lower bounds, weighted by population", () => {
        // (100 * 4 + 400 * 0.5) / 500 = 1.2
        expect(lowEnd(withIntervals)).toBeCloseTo(1.2);
    });

    it("is never above the ratio itself", () => {
        const high = { ...sample, blackRatioInterval: [50, 90] as [number, number], hispanicRatioInterval: [50, 90] as [number, number] };
        expect(lowEnd(high)).toBeCloseTo(combinedRatio(sample)!);
    });

    it("is unavailable when either interval is missing", () => {
        expect(lowEnd(sample)).toBeNull();
        expect(lowEnd({ ...sample, blackRatioInterval: [4, 8] })).toBeNull();
    });
});

describe("methodLabel", () => {
    it("treats 2019's unnamed method and 2020's county or city as an area population", () => {
        expect(methodLabel(undefined)).toBe("Area population");
        expect(methodLabel("County: Kane, McHenry")).toBe("Area population");
        expect(methodLabel("City: Elgin")).toBe("Area population");
        expect(methodLabel("Crash-based")).toBe("Crash-based");
    });
});

// four departments with ratios 4, 2, 0.5 and 8
const rows: RankingRow[] = [
    row("Four Police", [100, 1000], [40, 100], [40, 100]),                          // (80/200)/(0.1) = 4
    row("Two Police", [100, 1000], [20, 100], [20, 100], { kind: "sheriff", benchmarkMethod: "Distance-based" }),
    row("Half Police", [100, 1000], [15, 300], [15, 300], { benchmarkMethod: "Crash-based" }),   // (30/600)/(0.1) = 0.5
    row("Eight Police", [100, 1000], [80, 100], [80, 100], { incomplete: true }),
    row("Tiny Police", [100, 1000], [4, 100], [4, 100])                              // only 8 Black or Hispanic stops
];
const ranked = (options: Partial<RankingOptions> = {}, reporting = 7) => rankDepartments(rows, reporting, { ...defaultOptions, ...options });

describe("rankDepartments", () => {
    it("ranks the highest combined ratio first", () => {
        expect(ranked().ranked.map(d => d.row.name)).toEqual(["Four Police", "Two Police", "Half Police"]);
    });

    it("can rank the lowest first", () => {
        expect(ranked({ sort: "lowest" }).ranked.map(d => d.row.name)).toEqual(["Half Police", "Two Police", "Four Police"]);
    });

    it("can rank by the low end, putting departments without one last", () => {
        // Four Police (ratio 4) has a wide interval, down to 1.0; Two Police (ratio 2) a narrow one, down to 1.9
        const interval = (low: number): Partial<RankingRow> => ({ blackRatioInterval: [low, 9], hispanicRatioInterval: [low, 9] });
        const withIntervals = [{ ...rows[0], ...interval(1) }, { ...rows[1], ...interval(1.9) }, ...rows.slice(2)];
        const result = rankDepartments(withIntervals, 7, { ...defaultOptions, sort: "lowEnd" });
        expect(result.ranked.map(d => d.row.name)).toEqual(["Two Police", "Four Police", "Half Police"]);
        expect(result.ranked[0].lowEnd).toBeCloseTo(1.9);
        expect(result.ranked[2].lowEnd).toBeNull();
    });

    it("leaves out departments flagged incomplete, unless asked", () => {
        expect(ranked().ranked.map(d => d.row.name)).not.toContain("Eight Police");
        expect(ranked({ includeIncomplete: true }).ranked[0].row.name).toBe("Eight Police");
    });

    it("needs the minimum number of stops in both groups", () => {
        expect(ranked({ minStops: 10 }).ranked.map(d => d.row.name)).toContain("Half Police");
        expect(ranked({ minStops: 50 }).ranked.map(d => d.row.name)).toEqual(["Four Police"]);
    });

    it("accounts for every department that reported", () => {
        const { counts } = ranked();
        expect(counts).toEqual({ reporting: 7, noBenchmark: 2, incomplete: 1, tooFewStops: 1, eligible: 3, shown: 3 });
        expect(counts.noBenchmark + counts.incomplete + counts.tooFewStops + counts.eligible).toBe(counts.reporting);
    });

    it("filters by type, method and name, after working out the typical ratio", () => {
        expect(ranked({ kind: "sheriff" }).ranked.map(d => d.row.name)).toEqual(["Two Police"]);
        expect(ranked({ method: "Crash-based" }).ranked.map(d => d.row.name)).toEqual(["Half Police"]);
        expect(ranked({ search: "two" }).ranked.map(d => d.row.name)).toEqual(["Two Police"]);
        const filtered = ranked({ kind: "sheriff" });
        expect(filtered.counts).toMatchObject({ eligible: 3, shown: 1 });
        expect(filtered.medianRatio).toBeCloseTo(2); // the median of 4, 2 and 0.5: not just of the one shown
    });

    it("gives no typical ratio when nothing can be compared", () => {
        expect(rankDepartments([], 0, defaultOptions).medianRatio).toBeNull();
    });
});

describe("explainExclusion", () => {
    it("says why a department is left out", () => {
        expect(explainExclusion(undefined, defaultOptions)).toContain("reported no traffic stops that year");
        expect(explainExclusion(rows[3], defaultOptions)).toContain("incomplete");
        expect(explainExclusion(rows[4], defaultOptions)).toBe("It made only 100 White and 8 Black or Hispanic stops, and the minimum is 30 of each.");
        expect(explainExclusion(rows[1], { ...defaultOptions, kind: "campus" })).toContain("department type");
        expect(explainExclusion(rows[1], { ...defaultOptions, method: "Crash-based" })).toContain("benchmark method");
        expect(explainExclusion(rows[1], { ...defaultOptions, search: "zzz" })).toContain("search box");
    });

    it("says nothing about a department that is in the list", () => {
        expect(explainExclusion(rows[0], defaultOptions)).toBeNull();
    });
});

describe("the page's options in the address bar", () => {
    it("leaves the defaults out, so a plain link stays short", () => {
        expect(toQuery({ year: 2025, options: defaultOptions, department: null })).toBe("?year=2025");
    });

    it("round-trips every option", () => {
        const view = { year: 2022, department: "belvidere-police", options: { minStops: 100, includeIncomplete: true, kind: "sheriff" as const, method: "Crash-based", sort: "lowEnd" as const, search: "county" } };
        expect(parseView(toQuery(view))).toEqual(view);
    });

    it("falls back to the defaults for anything it doesn't recognise", () => {
        expect(parseView("?year=abc&sort=sideways&type=zoo&min=-5")).toEqual({ year: null, department: null, options: defaultOptions });
        expect(parseView("")).toEqual({ year: null, department: null, options: defaultOptions });
    });
});
