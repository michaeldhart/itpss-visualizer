import { build } from "vite";
import { describe, expect, it } from "vitest";
import { pages, site } from "./config.ts";
import { applyTemplates, pageKeyFor, renderNav } from "./html.ts";

describe("renderNav", () => {
    it("links every page under the base path and marks the current one", () => {
        const nav = renderNav("/stops/", "rankings");
        expect(nav).toContain('href="/stops/"');
        expect(nav).toContain('href="/stops/department/"');
        expect(nav).toContain('<a href="/stops/rankings/" aria-current="page">');
        expect(nav.match(/aria-current/g)).toHaveLength(1);
        expect(nav).toContain(site.name);
    });

    it("lists the pages in the order they are configured", () => {
        const nav = renderNav("/", "home");
        const positions = pages.map(page => nav.indexOf(`>${page.label}</a>`));
        expect(positions.every(p => p > 0)).toBe(true);
        expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    });
});

describe("pageKeyFor", () => {
    it("works out which page a file is", () => {
        expect(pageKeyFor("/repo/index.html")).toBe("home");
        expect(pageKeyFor("/repo/department/index.html")).toBe("department");
        expect(pageKeyFor("/repo/rankings/index.html")).toBe("rankings");
    });
});

describe("applyTemplates", () => {
    it("fills in the shared pieces and the base path", () => {
        const html = applyTemplates("<head><!-- site-head --></head><body><!-- site-nav --><a href='{{base}}x'></a><!-- site-footer --></body>", "/b/", "home");
        expect(html).toContain('<link rel="stylesheet" href="/css/skeleton.css">');
        expect(html).toContain('<nav class="site-nav');
        expect(html).toContain("href='/b/x'");
        expect(html).toContain("Design and source code by");
        expect(html).not.toMatch(/\{\{base\}\}|<!-- site-/);
    });
});

// Build the whole site in memory under a base path that isn't "/", the way GitHub Pages serves it
describe("the built site", async () => {
    const base = "/stops/";
    const output = await build({ base, logLevel: "silent", build: { write: false, outDir: "dist-test" } });
    const files = new Map((Array.isArray(output) ? output : [output as never]).flatMap((o: any) => o.output).map((f: any) => [f.fileName as string, f]));
    const html = (file: string) => String(files.get(file).source);

    it("has a page for each nav item", () => {
        pages.forEach(page => expect(files.has(`${page.path}index.html`), page.path).toBe(true));
    });

    it("gives each page the nav, marking itself as current", () => {
        pages.forEach(page => {
            const text = html(`${page.path}index.html`);
            expect(text, page.key).toContain('<nav class="site-nav');
            expect(text.match(/aria-current="page"/g), page.key).toHaveLength(1);
            expect(text, page.key).toContain(`<a href="${base}${page.path}" aria-current="page">`);
        });
    });

    it("leaves no unfilled template markers behind", () => {
        pages.forEach(page => expect(html(`${page.path}index.html`), page.key).not.toMatch(/\{\{base\}\}|<!-- site-/));
    });

    it("titles every page with the site name and describes it", () => {
        pages.forEach(page => {
            const text = html(`${page.path}index.html`);
            expect(text.match(/<title>(.*?)<\/title>/)![1], page.key).toContain(site.name);
            expect(text, page.key).toMatch(/<meta name="description" content="[^"]{40,}"/);
        });
    });

    it("links only to pages and assets that exist", () => {
        const exists = (path: string) => {
            const file = path.replace(base, "").split(/[?#]/)[0];
            return files.has(file) || files.has(`${file}index.html`) || file === "" || /^(css|images|data)\//.test(file); // public files aren't in an in-memory build
        };

        pages.forEach(page => {
            const links = [...html(`${page.path}index.html`).matchAll(/(?:href|src)="(\/stops\/[^"]*)"/g)].map(m => m[1]);
            expect(links.length, page.key).toBeGreaterThan(0);
            links.forEach(link => expect(exists(link), `${page.key} -> ${link}`).toBe(true));
        });
    });

    it("sends old shared links to the department page, keeping the hash", () => {
        const home = html("index.html");
        expect(home).toContain('location.hash.indexOf("#/") === 0');
        expect(home).toContain(`location.replace("${base}department/" + location.hash)`);
        expect(home).toContain('addEventListener("hashchange"'); // a hash typed while already on the home page
    });
});
