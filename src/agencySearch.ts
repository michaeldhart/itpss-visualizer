import { AgencyIndexEntry } from "./types";

// Lowercase, punctuation to spaces: "St. Charles Police" -> "st charles police"
function normalize(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Lower is a better match: 0 = name starts with the query, 1 = a word does, 2 = the words appear
// somewhere in the name, undefined = not a match.
function rank(name: string, tokens: string[]): number | undefined {
    if (!tokens.every(token => name.includes(token))) {
        return undefined;
    }

    const query = tokens.join(" ");

    if (name.startsWith(query)) {
        return 0;
    }

    return name.includes(` ${query}`) ? 1 : 2;
}

export interface SearchResult {
    matches: AgencyIndexEntry[];
    // how many agencies matched in total, which can exceed matches.length
    total: number;
}

// Every word typed must appear in the name, in any order ("county kane" finds "Kane County Sheriff").
// An empty query matches everything, in the order given.
export function searchAgencies(query: string, agencies: AgencyIndexEntry[], limit: number): SearchResult {
    const tokens = normalize(query).split(" ").filter(Boolean);

    if (tokens.length === 0) {
        return { matches: agencies.slice(0, limit), total: agencies.length };
    }

    const ranked: { agency: AgencyIndexEntry; rank: number }[] = [];

    for (const agency of agencies) {
        const r = rank(normalize(agency.name), tokens);

        if (r !== undefined) {
            ranked.push({ agency, rank: r });
        }
    }

    // Array.sort is stable, so equally ranked agencies keep their alphabetical order
    ranked.sort((a, b) => a.rank - b.rank);

    return { matches: ranked.slice(0, limit).map(r => r.agency), total: ranked.length };
}
