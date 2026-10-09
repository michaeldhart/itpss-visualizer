export type StopType = "traffic" | "pedestrian";

export const StopTypes: StopType[] = ["traffic", "pedestrian"];

// Shapes of the JSON files under public/data/.

export interface AgencyIndexEntry {
    id: string;
    name: string;
    years: Record<StopType, number[]>;
}

export interface AgencyFile {
    id: string;
    name: string;
    traffic: Record<string, YearStats>;
    pedestrian: Record<string, YearStats>;
}

export interface YearStats {
    totalStops: number;
    // null when the report for that year does not publish a population benchmark
    totalBenchmark: number | null;
    white: RaceYearStats;
    black: RaceYearStats;
    hispanic: RaceYearStats;
    // the remaining race groups IDOT reports, present for years whose reports include them
    asian?: RaceYearStats;
    americanIndian?: RaceYearStats;
    pacificIslander?: RaceYearStats;
    // stops where the officer did not record the driver's race (older reports)
    notStated?: RaceYearStats;
    // older traffic reports publish only this single estimate of the minority share of the driving population
    minorityBenchmarkPercent?: number;
    // how that year's report built the population benchmark, as IDOT describes it (e.g. "Crash-based")
    benchmarkMethod?: string;
    // IDOT flagged the agency as having submitted incomplete stop data that year
    incomplete?: true;
}

export interface RaceYearStats {
    stops: number;
    benchmark: number | null;
}

// View models consumed by the chart makers.

export interface StopStatistics {
    totalStops: number;
    white: { stops: number };
    black: { stops: number };
    hispanic: { stops: number };
}

export interface LocalityStatisticSet extends StopStatistics {
    name: string;
    totalBenchmark: number;
    white: RaceStatisticSet;
    black: RaceStatisticSet;
    hispanic: RaceStatisticSet;
}

export interface RaceStatisticSet {
    benchmark: number;
    stops: number;
}
