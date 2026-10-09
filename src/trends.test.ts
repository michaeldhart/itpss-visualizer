import { describe, expect, it } from "vitest";
import { benchmarkFamily, benchmarkPeriods, buildTrend, describePeriod, toYearTrend } from "./trends";
import { niceAxis } from "./trendChart";
import { YearStats } from "./types";

const none = null;
const race = (stops: number, benchmark: number | null = none) => ({ stops, benchmark });

// ADDISON POLICE, 2012 (IDOT printed ratio 0.85)
const older: YearStats = {
    totalStops: 5843, totalBenchmark: none, white: race(3526), black: race(525), hispanic: race(1569),
    asian: race(163), americanIndian: race(20), pacificIslander: race(40), minorityBenchmarkPercent: 46.42
};

const full: YearStats = {
    totalStops: 100, totalBenchmark: 1000, white: race(50, 500), black: race(30, 100), hispanic: race(20, 200), benchmarkMethod: "Crash-based"
};

describe("toYearTrend", () => {
    it("uses IDOT's estimate of the minority population for the older reports", () => {
        const t = toYearTrend(2012, older);
        expect(t.benchmarkFamily).toBe("estimate");
        expect(t.minorityPopulationShare).toBeCloseTo(0.4642);
        expect(t.minorityRatio!.toFixed(2)).toBe("0.85");
        expect(t.blackRateRatio).toBeNull();
    });

    it("derives the minority population share and rate ratios from a benchmark by race", () => {
        const t = toYearTrend(2022, full);
        expect(t.benchmarkFamily).toBe("modern");
        expect(t.minorityPopulationShare).toBeCloseTo(0.5); // (1000 - 500) / 1000
        expect(t.minorityStopShare).toBeCloseTo(0.5);
        expect(t.minorityRatio).toBeCloseTo(1);
        expect(t.blackRateRatio).toBeCloseTo(3);   // (30/100) / (50/500)
        expect(t.hispanicRateRatio).toBeCloseTo(1);
    });

    it("has no population share or ratios without any benchmark", () => {
        const t = toYearTrend(2025, { ...full, totalBenchmark: none, white: race(50), black: race(30), hispanic: race(20) });
        expect(t.benchmarkFamily).toBe("none");
        expect(t.minorityPopulationShare).toBeNull();
        expect(t.minorityRatio).toBeNull();
    });

    it("has no ratio when a group has no benchmark population or there are no White stops", () => {
        expect(toYearTrend(2022, { ...full, black: race(30, 0) }).blackRateRatio).toBeNull();
        expect(toYearTrend(2022, { ...full, white: race(0, 500) }).blackRateRatio).toBeNull();
    });

    it("leaves out stops with no race recorded", () => {
        const t = toYearTrend(2005, { ...older, notStated: race(500) });
        expect(t.knownStops).toBe(5843);
    });
});

describe("benchmarkFamily", () => {
    it("tells the eras of benchmark apart", () => {
        expect(benchmarkFamily(older)).toBe("estimate");
        expect(benchmarkFamily({ ...full, benchmarkMethod: undefined })).toBe("area"); // 2019 names no method
        expect(benchmarkFamily({ ...full, benchmarkMethod: "County: Kane, McHenry" })).toBe("area");
        expect(benchmarkFamily({ ...full, benchmarkMethod: "City: Elgin" })).toBe("area");
        expect(benchmarkFamily({ ...full, benchmarkMethod: "Distance-based" })).toBe("modern");
        expect(benchmarkFamily({ ...full, benchmarkMethod: "Territory-based" })).toBe("modern");
        expect(benchmarkFamily({ ...full, benchmarkMethod: "Community demographics" })).toBe("community");
    });
});

describe("benchmarkPeriods", () => {
    const years: Record<string, YearStats> = {
        2017: older, 2018: older,
        2019: { ...full, benchmarkMethod: undefined }, 2020: { ...full, benchmarkMethod: "County: Kane" },
        2021: { ...full, benchmarkMethod: "Crash-based" }, 2022: { ...full, benchmarkMethod: "Distance-based" }, 2024: { ...full, benchmarkMethod: "Crash-based" }
    };

    it("groups consecutive years by benchmark family, skipping years the agency didn't report", () => {
        const periods = benchmarkPeriods(buildTrend(years));
        expect(periods.map(p => [p.family, p.firstYear, p.lastYear])).toEqual([
            ["estimate", 2017, 2018], ["area", 2019, 2020], ["modern", 2021, 2024]
        ]);
        expect(periods[2].methods).toEqual(["Crash-based", "Distance-based"]);
    });

    it("describes each period", () => {
        const periods = benchmarkPeriods(buildTrend(years));
        expect(describePeriod(periods[0], "traffic")).toContain("estimate");
        expect(describePeriod(periods[2], "traffic")).toBe("crash-based or distance-based benchmark");
    });

    it("sorts years oldest first", () => {
        expect(buildTrend(years).map(t => t.year)).toEqual([2017, 2018, 2019, 2020, 2021, 2022, 2024]);
    });
});

describe("niceAxis", () => {
    it("rounds the top of an axis up to a tidy number", () => {
        expect(niceAxis(0.37)).toEqual({ max: 0.4, step: 0.1 });
        expect(niceAxis(100)).toEqual({ max: 100, step: 25 });
        expect(niceAxis(7.3).max).toBeGreaterThanOrEqual(7.3);
        expect(niceAxis(2).max).toBe(2);
    });

    it("never goes below the value", () => {
        for (const v of [0.01, 0.1, 0.99, 1, 1.01, 3.7, 9.9, 36.7]) {
            expect(niceAxis(v).max).toBeGreaterThanOrEqual(v);
        }
    });
});
