import { describe, expect, it } from "vitest";
import { getEraNotice } from "./eras";
import { toStatisticSet, getRateRatioVsWhite, RaceCategory } from "./utils";
import { YearStats } from "./types";

const full: YearStats = {
    totalStops: 100, totalBenchmark: 1000,
    white: { stops: 50, benchmark: 500 },
    black: { stops: 30, benchmark: 100 },
    hispanic: { stops: 20, benchmark: 200 }
};

describe("getEraNotice", () => {
    it("warns for traffic years without per-race benchmarks", () => {
        expect(getEraNotice(2004, "traffic")).toContain("through 2018");
        expect(getEraNotice(2018, "traffic")).toContain("through 2018");
    });

    it("has no notice for full-data years", () => {
        expect(getEraNotice(2019, "traffic")).toBeNull();
        expect(getEraNotice(2025, "pedestrian")).toBeNull();
    });

    it("has no notice for pedestrian years, which always include a population count by race", () => {
        expect(getEraNotice(2016, "pedestrian")).toBeNull();
        expect(getEraNotice(2018, "pedestrian")).toBeNull();
    });
});

describe("toStatisticSet", () => {
    it("returns null when a benchmark is missing", () => {
        expect(toStatisticSet("x", { ...full, black: { stops: 30, benchmark: null } })).toBeNull();
        expect(toStatisticSet("x", { ...full, totalBenchmark: null })).toBeNull();
    });

    it("computes rate ratios vs white", () => {
        const set = toStatisticSet("x", full)!;
        expect(getRateRatioVsWhite(set, RaceCategory.BLACK)).toBe("3.0");
        expect(getRateRatioVsWhite(set, RaceCategory.HISPANIC)).toBe("1.0");
    });
});
