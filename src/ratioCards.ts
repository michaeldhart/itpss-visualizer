import { smallSampleStops } from "./trends";
import { MinorityComparison } from "./utils";

// The text of one big-number card at the top of the page
export interface RatioCard {
    value: string;
    // what the number is a multiple of
    detail: string;
    // the stops behind it
    extra: string;
    // a warning when the number rests on few stops; empty otherwise
    note: string;
}

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

export function whiteBaselineCard(whiteStops: number): RatioCard {
    return { value: "1.0×", detail: "the baseline", extra: `${whiteStops.toLocaleString()} White stops`, note: "" };
}

// How a group's stop rate compares with White drivers'. ratio is null when it can't be calculated.
export function rateRatioCard(group: string, ratio: number | null, groupStops: number, whiteStops: number): RatioCard {
    if (ratio === null) {
        return { value: "-", detail: "can't be calculated", extra: `${groupStops.toLocaleString()} ${group} stops`, note: "" };
    }

    const fewest = Math.min(groupStops, whiteStops);

    return {
        value: `${ratio.toFixed(1)}×`,
        detail: "the White stop rate",
        extra: `${groupStops.toLocaleString()} ${group} stops`,
        note: fewest < smallSampleStops ? `Based on as few as ${fewest} stops, so this can swing widely.` : ""
    };
}

// IDOT's own "ratio" for the older reports: the minority share of stops over the minority share of drivers
export function minorityRatioCard(comparison: MinorityComparison): RatioCard {
    const known = comparison.whiteStops + comparison.minorityStops;
    const shares = `${percent(comparison.minorityStopShare)} of stops ÷ ${percent(comparison.minorityPopulationShare)} of drivers`;

    return {
        value: comparison.ratio === null ? "-" : `${comparison.ratio.toFixed(2)}×`,
        detail: comparison.ratio === null ? "not available: IDOT estimated no minority drivers here" : "the minority share of drivers",
        extra: shares,
        note: known < smallSampleStops ? `Only ${known} stops with a recorded race, so this can swing widely.` : ""
    };
}
