import { LocalityStatisticSet, YearStats } from "./types";

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

export function getRateRatioVsWhite(statisticsSet: LocalityStatisticSet, raceCategory: RaceCategory) {
    const whiteStopRate = statisticsSet.white.stops / statisticsSet.white.benchmark;
    let raceCategoryStopRate;

    switch(raceCategory) {
        case RaceCategory.WHITE:
            return "1.0";
        case RaceCategory.BLACK:
            raceCategoryStopRate = statisticsSet.black.stops / statisticsSet.black.benchmark;
            break;
        case RaceCategory.HISPANIC:
            raceCategoryStopRate = statisticsSet.hispanic.stops / statisticsSet.hispanic.benchmark;
            break;
    }

    return (raceCategoryStopRate / whiteStopRate).toFixed(1).toString();
}
