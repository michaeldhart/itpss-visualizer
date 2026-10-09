import { StopType } from "./types";

interface DataEra {
    stopType: StopType;
    firstYear: number;
    lastYear: number;
    notice: string;
}

// IDOT's traffic stop reports through 2018 give each department's stops by race, but only a single
// estimate of the minority share of the driving population rather than a benchmark for each race,
// so those years compare White and minority drivers instead.
// Pedestrian reports (2016 on) always include a population count by race.
const eras: DataEra[] = [
    {
        stopType: "traffic",
        firstYear: 2004,
        lastYear: 2018,
        notice: `IDOT's traffic stop reports through 2018 don't count the population by race, as the reports for later years do.
            They estimate only the share of drivers who are minority, so the comparison for these years is between White and minority
            drivers instead of by race.`
    }
];

export function getEraNotice(year: number, stopType: StopType): string | null {
    const era = eras.find(e => e.stopType === stopType && year >= e.firstYear && year <= e.lastYear);

    return era ? era.notice : null;
}
