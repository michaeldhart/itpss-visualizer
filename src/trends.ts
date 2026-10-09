import { StopType, YearStats } from "./types";
import { RaceCategory, rateRatioVsWhite, toStatisticSet } from "./utils";

// How a year's report arrived at its population benchmark. The meaning of the benchmark changes between
// families, so a trend line should not be read straight across a change.
export type BenchmarkFamily = "estimate" | "community" | "area" | "modern" | "none";

export interface YearTrend {
    year: number;
    // stops where the driver's race was recorded
    knownStops: number;
    minorityStops: number;
    minorityStopShare: number | null;
    minorityPopulationShare: number | null;
    // minority share of stops divided by minority share of the population (IDOT's "ratio")
    minorityRatio: number | null;
    blackRateRatio: number | null;
    hispanicRateRatio: number | null;
    whiteStops: number;
    blackStops: number;
    hispanicStops: number;
    benchmarkFamily: BenchmarkFamily;
    benchmarkMethod: string | undefined;
    incomplete: boolean;
}

// Fewer stops than this and a share or ratio can swing widely, so its point is drawn hollow
export const smallSampleStops = 30;

export function benchmarkFamily(stats: YearStats): BenchmarkFamily {
    if (stats.totalBenchmark === null) {
        return stats.minorityBenchmarkPercent !== undefined ? "estimate" : "none";
    }

    const method = stats.benchmarkMethod;

    if (!method || /^(County|City|State)\b/.test(method)) {
        return "area"; // 2019 names no method; 2020 names the county or city used
    }

    return method === "Community demographics" ? "community" : "modern";
}

export function toYearTrend(year: number, stats: YearStats): YearTrend {
    const groups = [stats.black, stats.hispanic, stats.asian, stats.americanIndian, stats.pacificIslander];
    const minorityStops = groups.reduce((sum, group) => sum + (group?.stops ?? 0), 0);
    const knownStops = stats.white.stops + minorityStops;
    const minorityStopShare = knownStops > 0 ? minorityStops / knownStops : null;
    const family = benchmarkFamily(stats);
    const statistics = toStatisticSet("", stats);

    let minorityPopulationShare: number | null = null;

    if (statistics) {
        minorityPopulationShare = (statistics.totalBenchmark - statistics.white.benchmark) / statistics.totalBenchmark;
    } else if (stats.minorityBenchmarkPercent !== undefined) {
        minorityPopulationShare = stats.minorityBenchmarkPercent / 100;
    }

    const ratio = minorityStopShare !== null && minorityPopulationShare ? minorityStopShare / minorityPopulationShare : null;

    return {
        year,
        knownStops,
        minorityStops,
        minorityStopShare,
        minorityPopulationShare,
        minorityRatio: ratio !== null && Number.isFinite(ratio) ? ratio : null,
        blackRateRatio: statistics ? rateRatioVsWhite(statistics, RaceCategory.BLACK) : null,
        hispanicRateRatio: statistics ? rateRatioVsWhite(statistics, RaceCategory.HISPANIC) : null,
        whiteStops: stats.white.stops,
        blackStops: stats.black.stops,
        hispanicStops: stats.hispanic.stops,
        benchmarkFamily: family,
        benchmarkMethod: stats.benchmarkMethod,
        incomplete: stats.incomplete === true
    };
}

// One entry per year the agency reported, oldest first
export function buildTrend(years: Record<string, YearStats>): YearTrend[] {
    return Object.keys(years).map(Number).sort((a, b) => a - b).map(year => toYearTrend(year, years[year]));
}

export interface BenchmarkPeriod {
    family: BenchmarkFamily;
    firstYear: number;
    lastYear: number;
    // the methods IDOT names for the years in the period (e.g. "Crash-based", "Distance-based")
    methods: string[];
}

// Runs of consecutive reported years that share a benchmark family
export function benchmarkPeriods(trend: YearTrend[]): BenchmarkPeriod[] {
    const periods: BenchmarkPeriod[] = [];

    for (const t of trend) {
        const last = periods[periods.length - 1];

        if (last && last.family === t.benchmarkFamily) {
            last.lastYear = t.year;
        } else {
            periods.push({ family: t.benchmarkFamily, firstYear: t.year, lastYear: t.year, methods: [] });
        }

        const period = periods[periods.length - 1];

        if (t.benchmarkMethod && !period.methods.includes(t.benchmarkMethod) && t.benchmarkFamily === "modern") {
            period.methods.push(t.benchmarkMethod);
        }
    }

    return periods;
}

export function describePeriod(period: BenchmarkPeriod, stopType: StopType): string {
    switch (period.family) {
        case "estimate": return "IDOT's estimate of the minority share of drivers";
        case "community": return "community demographics";
        case "area": return "population of the county or city";
        case "modern": return period.methods.length > 0 ? `${period.methods.join(" or ").toLowerCase()} benchmark` : `${stopType} benchmark`;
        case "none": return "no population benchmark";
    }
}
