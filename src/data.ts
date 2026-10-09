import { AgencyFile, AgencyIndexEntry } from "./types";

const agencyCache = new Map<string, Promise<AgencyFile>>();

async function fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Could not load ${path} (${response.status})`);
    }

    return response.json();
}

export function loadAgencyIndex(): Promise<AgencyIndexEntry[]> {
    return fetchJson<AgencyIndexEntry[]>(`${import.meta.env.BASE_URL}data/agencies.json`);
}

// Each agency's years live in one file, loaded the first time the agency is selected.
export function loadAgency(id: string): Promise<AgencyFile> {
    let agency = agencyCache.get(id);

    if (!agency) {
        agency = fetchJson<AgencyFile>(`${import.meta.env.BASE_URL}data/agency/${id}.json`);
        agencyCache.set(id, agency);
    }

    return agency;
}
