import { describe, expect, it } from "vitest";
import { searchAgencies } from "./agencySearch";
import { AgencyIndexEntry } from "./types";

const agency = (name: string): AgencyIndexEntry => ({ id: name.toLowerCase().replace(/\W+/g, "-"), name, years: { traffic: [], pedestrian: [] } });

const agencies = [
    "Illinois Statewide", "Algonquin Police", "Augusta Police", "Kane County Sheriff", "St. Charles Police",
    "Chicago Police", "Chicago Police (1st District - Central)", "North Chicago Police", "University of Chicago Police"
].map(agency);

const names = (query: string, limit = 50) => searchAgencies(query, agencies, limit).matches.map(a => a.name);

describe("searchAgencies", () => {
    it("returns everything in the given order for an empty query", () => {
        expect(names("")).toEqual(agencies.map(a => a.name));
        expect(names("   ")).toEqual(agencies.map(a => a.name));
    });

    it("is case insensitive and ignores punctuation", () => {
        expect(names("ST CHARLES")).toEqual(["St. Charles Police"]);
        expect(names("st. charles")).toEqual(["St. Charles Police"]);
        expect(names("district - central")).toEqual(["Chicago Police (1st District - Central)"]);
    });

    it("matches words in any order", () => {
        expect(names("county kane")).toEqual(["Kane County Sheriff"]);
    });

    it("ranks names that start with the query ahead of ones that merely contain it", () => {
        expect(names("chicago")).toEqual([
            "Chicago Police", "Chicago Police (1st District - Central)", // start with it
            "North Chicago Police", "University of Chicago Police"       // a later word does
        ]);
    });

    it("matches partial words", () => {
        expect(names("algon")).toEqual(["Algonquin Police"]);
        expect(names("aug")).toEqual(["Augusta Police"]);
    });

    it("returns nothing for a query that matches no department", () => {
        expect(searchAgencies("zzz", agencies, 50)).toEqual({ matches: [], total: 0 });
    });

    it("limits the matches but reports the total", () => {
        const result = searchAgencies("police", agencies, 3);
        expect(result.matches).toHaveLength(3);
        expect(result.total).toBe(7);
    });
});
