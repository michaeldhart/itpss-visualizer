export interface LocalityStatisticSet {
    id: number;
    name: string;
    totalBenchmark: number;
    totalStops: number;
    white: RaceStatisticSet;
    black: RaceStatisticSet;
    hispanic: RaceStatisticSet;
}

interface RaceStatisticSet {
    benchmark: number;
    stops: number;
    stopRate: number;
    rateRatioVsWhite: number;
}

export const Data: LocalityStatisticSet[] = [
    {
        id: 0,
        name: "Belvidere Police Department",
        totalBenchmark: 37855,
        totalStops: 5396,
        white: {
            benchmark: 29192,
            stops: 3186,
            stopRate: 0.109,
            rateRatioVsWhite: 1
        },
        black: {
            benchmark: 761,
            stops: 627,
            stopRate: 0.82,
            rateRatioVsWhite: 7.5
        },
        hispanic: {
            benchmark: 7312,
            stops: 1537,
            stopRate: 0.21,
            rateRatioVsWhite: 1.9
        }
    }
];