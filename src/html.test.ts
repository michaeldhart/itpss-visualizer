import { describe, expect, it } from "vitest";
import page from "../index.html?raw";

// index.html is edited by hand, and one unclosed <div> silently nests a section inside another, so a section
// that is hidden takes the ones inside it along. Check that the page's sections are where they should be.
const html = page.split("<body>")[1];

function divDepths(): { depths: Record<string, number>; balance: number } {
    const depths: Record<string, number> = {};
    let depth = 0;

    for (const tag of html.matchAll(/<(\/?)div\b([^>]*)>/g)) {
        if (tag[1]) {
            depth--;
        } else {
            const id = tag[2].match(/\bid="([^"]+)"/)?.[1];

            if (id) {
                depths[id] = depth;
            }

            depth++;
        }
    }

    return { depths, balance: depth };
}

describe("index.html", () => {
    const { depths, balance } = divDepths();

    it("closes every div it opens", () => {
        expect(balance).toBe(0);
    });

    it("keeps each section out of the others, so hiding one doesn't hide another", () => {
        // directly under <body>
        ["visualization", "conclusion", "trends"].forEach(id => expect(depths[id], id).toBe(0));
        // directly inside #visualization
        ["ratio-summary", "minority-ratio-summary", "dot-maps", "line-charts", "minority-view"].forEach(id => expect(depths[id], id).toBe(1));
    });

    it("has the elements the page script looks up", () => {
        for (const id of ["agency-input", "year-select", "pop-chart", "projected-pop-chart", "no-bias-chart", "bias-chart",
            "minority-pop-chart", "minority-stops-chart", "rrvw-w", "rrvw-b", "rrvw-h", "rrvw-b-detail", "rrvw-b-extra", "rrvw-b-note", "minority-ratio", "trend-share-chart", "trend-ratio-chart"]) {
            expect(html, id).toContain(`id="${id}"`);
        }
    });
});
