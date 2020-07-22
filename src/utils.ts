import { LocalityStatisticSet } from "./data";

export enum Colors { BLUE = "blue", RED = "red", GREEN = "green" }
export enum RaceCategory { WHITE, BLACK, HISPANIC }

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