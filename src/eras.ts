import { StopType } from "./types";

interface DataEra {
    stopType: StopType;
    firstYear: number;
    lastYear: number;
    notice: string;
}

// IDOT's traffic stop reports through 2018 give each department's stops by race, but only a single
// estimate of the minority share of the driving population rather than a benchmark for each race.
// Pedestrian reports (2016 on) always include a population count by race.
const eras: DataEra[] = [
    {
        stopType: "traffic",
        firstYear: 2004,
        lastYear: 2018,
        notice: `IDOT's traffic stop reports through 2018 give each department's stops by race, but not the population
            benchmark by race used for later years. The population comparisons shown for later years can't be made for these
            years, so only the stops by race are shown.`
    }
];

export function getEraNotice(year: number, stopType: StopType): string | null {
    const era = eras.find(e => e.stopType === stopType && year >= e.firstYear && year <= e.lastYear);

    return era ? era.notice : null;
}
