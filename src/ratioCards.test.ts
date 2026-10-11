import { describe, expect, it } from "vitest";
import { minorityRatioCard, rateRatioCard, whiteBaselineCard } from "./ratioCards";
import { MinorityComparison } from "./utils";

describe("rateRatioCard", () => {
    it("shows the ratio to one decimal with the stops behind it", () => {
        expect(rateRatioCard("Black", 7.46, 627, 3186)).toEqual({
            value: "7.5×", detail: "the White stop rate", extra: "627 Black stops", note: ""
        });
    });

    it("warns when either group has few stops", () => {
        expect(rateRatioCard("Hispanic", 2, 12, 3000).note).toBe("Based on as few as 12 stops, so this can swing widely.");
        expect(rateRatioCard("Hispanic", 2, 3000, 8).note).toContain("as few as 8 stops");
        expect(rateRatioCard("Hispanic", 2, 30, 30).note).toBe(""); // 30 is enough, as in the trend charts
    });

    it("shows a dash when the ratio can't be calculated", () => {
        const card = rateRatioCard("Black", null, 5, 100);
        expect(card.value).toBe("-");
        expect(card.detail).toContain("can't be calculated");
    });

    it("keeps a ratio below 1 as it is", () => {
        expect(rateRatioCard("Hispanic", 0.4, 100, 100).value).toBe("0.4×");
    });
});

describe("whiteBaselineCard", () => {
    it("is always 1.0", () => {
        expect(whiteBaselineCard(3186)).toMatchObject({ value: "1.0×", extra: "3,186 White stops" });
    });
});

// ADDISON POLICE 2012: IDOT printed a ratio of 0.85
const addison: MinorityComparison = {
    whiteStops: 3526, minorityStops: 2317, minorityStopShare: 2317 / 5843, minorityPopulationShare: 0.4642, ratio: 2317 / 5843 / 0.4642
};

describe("minorityRatioCard", () => {
    it("matches the ratio IDOT printed, to two decimals", () => {
        const card = minorityRatioCard(addison);
        expect(card.value).toBe("0.85×");
        expect(card.extra).toBe("40% of stops ÷ 46% of drivers");
        expect(card.note).toBe("");
    });

    it("warns about few stops with a recorded race", () => {
        expect(minorityRatioCard({ ...addison, whiteStops: 20, minorityStops: 9 }).note).toContain("Only 29 stops");
    });

    it("shows a dash when there is no minority population to compare with", () => {
        const card = minorityRatioCard({ ...addison, ratio: null, minorityPopulationShare: 0 });
        expect(card.value).toBe("-");
        expect(card.detail).toContain("not available");
    });
});
