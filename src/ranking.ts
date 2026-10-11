import { nameMatches } from "./agencySearch";
import { DepartmentKind, RankingGroup, RankingRow } from "./types";

export const kindLabels: Record<DepartmentKind, string> = {
    police: "City or village police",
    sheriff: "Sheriff's office",
    campus: "Campus police",
    parks: "Park district or forest preserve",
    transit: "Rail, transit or airport",
    state: "State agency",
    other: "Other"
};

export type SortMode = "highest" | "lowest" | "lowEnd";

export interface RankingOptions {
    // a department needs at least this many White stops and this many Black plus Hispanic stops to be compared
    minStops: number;
    includeIncomplete: boolean;
    kind: DepartmentKind | "all";
    method: string | "all";
    sort: SortMode;
    search: string;
}

export const defaultOptions: RankingOptions = { minStops: 30, includeIncomplete: false, kind: "all", method: "all", sort: "highest", search: "" };

// Stop rate (stops per person in the benchmark) of a group relative to White drivers. null when it can't be worked out.
function ratio(group: { stops: number; benchmark: number }, white: RankingGroup): number | null {
    // Both sides need people in the benchmark, and White drivers need stops to compare against. Checked up front:
    // dividing by an infinite White rate would give a finite 0, which would rank as the lowest ratio of all.
    if (group.benchmark <= 0 || white.benchmark <= 0 || white.stops <= 0) {
        return null;
    }

    return (group.stops / group.benchmark) / (white.stops / white.benchmark);
}

export const groupStops = (row: RankingRow) => row.black.stops + row.hispanic.stops;

// Black and Hispanic drivers together, relative to White drivers. Asian and Native American drivers are not in it.
export function combinedRatio(row: RankingRow): number | null {
    return ratio({ stops: groupStops(row), benchmark: row.black.benchmark + row.hispanic.benchmark }, row.white);
}

export const blackRatio = (row: RankingRow) => ratio(row.black, row.white);
export const hispanicRatio = (row: RankingRow) => ratio(row.hispanic, row.white);

// The combined ratio is exactly the average of the two group ratios, weighted by each group's benchmark population.
// So the "low end" is that average taken at the bottom of IDOT's 95% interval for each group: what the combined ratio
// would be if both groups sat at the low end of IDOT's range. It is deliberately conservative (both groups being that
// low at once is less likely than 5%) and uses only numbers IDOT published. null when either interval is missing.
export function lowEnd(row: RankingRow): number | null {
    const combined = combinedRatio(row);
    const black = row.blackRatioInterval?.[0];
    const hispanic = row.hispanicRatioInterval?.[0];
    const population = row.black.benchmark + row.hispanic.benchmark;

    if (combined === null || black === undefined || hispanic === undefined || population <= 0) {
        return null;
    }

    // IDOT's printed figures are rounded, so never report a low end above the ratio itself
    return Math.min(combined, (row.black.benchmark * black + row.hispanic.benchmark * hispanic) / population);
}

// How a report's benchmark was built, in words that read well in a filter. 2019 names no method and 2020 names the
// county or city used; both are the population of an area.
export function methodLabel(method: string | undefined): string {
    return !method || /^(County|City|State)\b/.test(method) ? "Area population" : method;
}

export interface RankedDepartment {
    row: RankingRow;
    combinedRatio: number;
    lowEnd: number | null;
}

// How many departments fall away at each step, so the page can say what it left out and why
export interface RankingCounts {
    reporting: number;
    noBenchmark: number;
    incomplete: number;
    tooFewStops: number;
    // departments that can be compared, before the type, method and search filters
    eligible: number;
    shown: number;
}

export interface RankingResult {
    ranked: RankedDepartment[];
    counts: RankingCounts;
    // the typical (median) combined ratio among the comparable departments, for context
    medianRatio: number | null;
}

export function hasEnoughStops(row: RankingRow, minStops: number): boolean {
    return row.white.stops >= minStops && groupStops(row) >= minStops;
}

function median(values: number[]): number | null {
    if (values.length === 0) {
        return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function compare(mode: SortMode): (a: RankedDepartment, b: RankedDepartment) => number {
    const byName = (a: RankedDepartment, b: RankedDepartment) => a.row.name.localeCompare(b.row.name);

    switch (mode) {
        case "highest": return (a, b) => b.combinedRatio - a.combinedRatio || byName(a, b);
        case "lowest": return (a, b) => a.combinedRatio - b.combinedRatio || byName(a, b);
        // departments with no low end (a missing interval) go last
        case "lowEnd": return (a, b) => (b.lowEnd ?? -Infinity) - (a.lowEnd ?? -Infinity) || byName(a, b);
    }
}

export function rankDepartments(rows: RankingRow[], departmentsReporting: number, options: RankingOptions): RankingResult {
    const counts: RankingCounts = { reporting: departmentsReporting, noBenchmark: departmentsReporting - rows.length, incomplete: 0, tooFewStops: 0, eligible: 0, shown: 0 };
    const eligible: RankedDepartment[] = [];

    for (const row of rows) {
        const combined = combinedRatio(row);

        if (row.incomplete && !options.includeIncomplete) {
            counts.incomplete++;
        } else if (combined === null || !hasEnoughStops(row, options.minStops)) {
            counts.tooFewStops++;
        } else {
            eligible.push({ row, combinedRatio: combined, lowEnd: lowEnd(row) });
        }
    }

    counts.eligible = eligible.length;

    const ranked = eligible
        .filter(d => (options.kind === "all" || d.row.kind === options.kind)
            && (options.method === "all" || methodLabel(d.row.benchmarkMethod) === options.method)
            && nameMatches(d.row.name, options.search))
        .sort(compare(options.sort));

    counts.shown = ranked.length;

    return { ranked, counts, medianRatio: median(eligible.map(d => d.combinedRatio)) };
}

// Why a department isn't in the list, in words; null when it is (or when there's no such department)
export function explainExclusion(row: RankingRow | undefined, options: RankingOptions): string | null {
    if (!row) {
        return "It reported no traffic stops that year, or its report has no population benchmark by race.";
    }

    if (row.incomplete && !options.includeIncomplete) {
        return "IDOT flagged this department as having submitted incomplete data, so it is left out. Tick the box to include it.";
    }

    if (combinedRatio(row) === null || !hasEnoughStops(row, options.minStops)) {
        return `It made only ${row.white.stops.toLocaleString()} White and ${groupStops(row).toLocaleString()} Black or Hispanic stops, and the minimum is ${options.minStops} of each.`;
    }

    if (options.kind !== "all" && row.kind !== options.kind) {
        return `It is filtered out by the department type (${kindLabels[row.kind]}).`;
    }

    if (options.method !== "all" && methodLabel(row.benchmarkMethod) !== options.method) {
        return `It is filtered out by the benchmark method (${methodLabel(row.benchmarkMethod)}).`;
    }

    return nameMatches(row.name, options.search) ? null : "It is filtered out by the search box.";
}

// --- the page's options in the address bar, so a view can be shared ---

export interface RankingView {
    year: number | null;
    options: RankingOptions;
    // a department to point out, from a link on another page
    department: string | null;
}

const sortModes: SortMode[] = ["highest", "lowest", "lowEnd"];

export function parseView(search: string): RankingView {
    const params = new URLSearchParams(search);
    const year = Number(params.get("year"));
    const minStops = Number(params.get("min"));
    const sort = params.get("sort") as SortMode;
    const kind = params.get("type");

    return {
        year: Number.isInteger(year) && year > 0 ? year : null,
        department: params.get("department"),
        options: {
            minStops: Number.isInteger(minStops) && minStops >= 1 ? minStops : defaultOptions.minStops,
            includeIncomplete: params.get("incomplete") === "1",
            kind: kind && kind in kindLabels ? kind as DepartmentKind : "all",
            method: params.get("method") || "all",
            sort: sortModes.includes(sort) ? sort : defaultOptions.sort,
            search: params.get("q") ?? ""
        }
    };
}

// Only what differs from the defaults goes in the address
export function toQuery(view: RankingView): string {
    const params = new URLSearchParams();
    const { options } = view;

    if (view.year !== null) params.set("year", String(view.year));
    if (options.sort !== defaultOptions.sort) params.set("sort", options.sort);
    if (options.minStops !== defaultOptions.minStops) params.set("min", String(options.minStops));
    if (options.kind !== "all") params.set("type", options.kind);
    if (options.method !== "all") params.set("method", options.method);
    if (options.includeIncomplete) params.set("incomplete", "1");
    if (options.search) params.set("q", options.search);
    if (view.department) params.set("department", view.department);

    const query = params.toString();

    return query ? `?${query}` : "";
}
