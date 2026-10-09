import { LocalityStatisticSet, StopStatistics, YearStats } from "./types";

export enum Colors { BLUE = "blue", RED = "red", GREEN = "green" }
export enum RaceCategory { WHITE, BLACK, HISPANIC }

// Returns null when the year has no per-race population benchmark, since the
// benchmark-based comparisons can't be made without it.
export function toStatisticSet(name: string, stats: YearStats): LocalityStatisticSet | null {
    const { totalBenchmark, white, black, hispanic } = stats;

    if (totalBenchmark === null || white.benchmark === null || black.benchmark === null || hispanic.benchmark === null) {
        return null;
    }

    return {
        name,
        totalStops: stats.totalStops,
        totalBenchmark,
        white: { stops: white.stops, benchmark: white.benchmark },
        black: { stops: black.stops, benchmark: black.benchmark },
        hispanic: { stops: hispanic.stops, benchmark: hispanic.benchmark }
    };
}

export function getStopRateRatio(statisticsSet: LocalityStatisticSet) {
    return statisticsSet.totalStops / statisticsSet.totalBenchmark;
}

// Stop rate of a race (stops / benchmark population) divided by the White stop rate; null when either rate
// can't be calculated (no White stops, or a race with no population).
export function rateRatioVsWhite(statisticsSet: LocalityStatisticSet, raceCategory: RaceCategory): number | null {
    const race = raceCategory === RaceCategory.WHITE ? statisticsSet.white
        : raceCategory === RaceCategory.BLACK ? statisticsSet.black : statisticsSet.hispanic;
    const ratio = (race.stops / race.benchmark) / (statisticsSet.white.stops / statisticsSet.white.benchmark);

    return Number.isFinite(ratio) ? ratio : null;
}

export function getRateRatioVsWhite(statisticsSet: LocalityStatisticSet, raceCategory: RaceCategory) {
    if (raceCategory === RaceCategory.WHITE) {
        return "1.0";
    }

    return (rateRatioVsWhite(statisticsSet, raceCategory) ?? NaN).toFixed(1).toString();
}

// What fraction of the dots in a chart are red and green; the rest are blue.
export interface DotShares {
    red: number;
    green: number;
}

// Colors for `count` dots, red first, then green, then blue.
export function dotColors(count: number, shares: DotShares): Colors[] {
    let redCount = count * shares.red;
    let greenCount = count * shares.green;

    return Array.from({ length: count }, () => {
        if (redCount > 0) {
            redCount--;
            return Colors.RED;
        }

        if (greenCount > 0) {
            greenCount--;
            return Colors.GREEN;
        }

        return Colors.BLUE;
    });
}

export function benchmarkShares(statistics: LocalityStatisticSet): DotShares {
    return {
        red: statistics.black.benchmark / statistics.totalBenchmark,
        green: statistics.hispanic.benchmark / statistics.totalBenchmark
    };
}

export function stopShares(statistics: StopStatistics): DotShares {
    return {
        red: statistics.black.stops / statistics.totalStops,
        green: statistics.hispanic.stops / statistics.totalStops
    };
}

// The older traffic reports (through 2018) have no population benchmark by race, only IDOT's estimate of
// the minority share of the driving population. That still allows a White vs. minority comparison.
export interface MinorityComparison {
    whiteStops: number;
    minorityStops: number;
    // fractions between 0 and 1
    minorityStopShare: number;
    minorityPopulationShare: number;
    // share of stops divided by share of the population, as in IDOT's "Ratio"; null if the population share is 0
    ratio: number | null;
}

// "Minority" is every driver not recorded as White. Stops where race was not stated are left out, as IDOT does.
export function toMinorityComparison(stats: YearStats): MinorityComparison | null {
    if (stats.minorityBenchmarkPercent === undefined) {
        return null;
    }

    const groups = [stats.black, stats.hispanic, stats.asian, stats.americanIndian, stats.pacificIslander];
    const minorityStops = groups.reduce((sum, group) => sum + (group?.stops ?? 0), 0);
    const knownStops = stats.white.stops + minorityStops;

    if (knownStops === 0) {
        return null;
    }

    const minorityStopShare = minorityStops / knownStops;
    const minorityPopulationShare = stats.minorityBenchmarkPercent / 100;

    return {
        whiteStops: stats.white.stops,
        minorityStops,
        minorityStopShare,
        minorityPopulationShare,
        ratio: minorityPopulationShare > 0 ? minorityStopShare / minorityPopulationShare : null
    };
}
