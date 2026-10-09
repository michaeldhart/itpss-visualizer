import { describe, expect, it } from "vitest";
import { Colors, dotColors, toMinorityComparison } from "./utils";
import { YearStats } from "./types";

// ADDISON POLICE, 2012: IDOT printed 3,526 White and 2,317 minority stops, an estimated 46.42% minority driving population, ratio 0.85
const addison2012: YearStats = {
    totalStops: 5843, totalBenchmark: null,
    white: { stops: 3526, benchmark: null }, black: { stops: 525, benchmark: null }, hispanic: { stops: 1569, benchmark: null },
    asian: { stops: 163, benchmark: null }, americanIndian: { stops: 20, benchmark: null }, pacificIslander: { stops: 40, benchmark: null },
    minorityBenchmarkPercent: 46.42
};

describe("toMinorityComparison", () => {
    it("reproduces IDOT's printed figures", () => {
        const comparison = toMinorityComparison(addison2012)!;
        expect(comparison.minorityStops).toBe(2317);
        expect(comparison.minorityStopShare).toBeCloseTo(0.3965, 4);
        expect(comparison.ratio!.toFixed(2)).toBe("0.85");
    });

    it("counts every group that isn't White as minority, and leaves out stops with no race recorded", () => {
        const comparison = toMinorityComparison({ ...addison2012, notStated: { stops: 500, benchmark: null } })!;
        expect(comparison.whiteStops + comparison.minorityStops).toBe(5843);
    });

    it("works for the 2004-2008 reports, which have no Pacific Islander group", () => {
        const { pacificIslander, ...early } = addison2012;
        expect(toMinorityComparison(early)!.minorityStops).toBe(2277);
    });

    it("has no ratio when the estimated minority population is zero", () => {
        expect(toMinorityComparison({ ...addison2012, minorityBenchmarkPercent: 0 })!.ratio).toBeNull();
    });

    it("is unavailable without the estimate, or without any stops of known race", () => {
        const { minorityBenchmarkPercent, ...without } = addison2012;
        expect(toMinorityComparison(without)).toBeNull();
        const none = { ...addison2012, white: { stops: 0, benchmark: null }, black: { stops: 0, benchmark: null }, hispanic: { stops: 0, benchmark: null },
            asian: undefined, americanIndian: undefined, pacificIslander: undefined };
        expect(toMinorityComparison(none)).toBeNull();
    });
});

describe("dotColors", () => {
    it("draws red dots first, then green, then blue", () => {
        const colors = dotColors(10, { red: 0.2, green: 0.3 });
        expect(colors).toHaveLength(10);
        expect(colors.slice(0, 2)).toEqual([Colors.RED, Colors.RED]);
        expect(colors.slice(2, 5)).toEqual([Colors.GREEN, Colors.GREEN, Colors.GREEN]);
        expect(colors.slice(5)).toEqual(Array(5).fill(Colors.BLUE));
    });

    it("draws only blue dots when there are no other groups", () => {
        expect(new Set(dotColors(50, { red: 0, green: 0 }))).toEqual(new Set([Colors.BLUE]));
    });
});
