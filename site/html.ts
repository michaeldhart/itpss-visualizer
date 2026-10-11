import { PageKey, pages, site } from "./config.ts";

// The pieces every page shares. Pages mark where they go with comments (<!-- site-head --> and so on) and the
// build fills them in, so there is one copy of the nav, the head tags and the footer.

export function renderHead(): string {
    // Absolute paths with no base: Vite adds the base path to these itself
    return `<meta charset="utf-8">
    <meta name="author" content="${site.author}">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="//fonts.googleapis.com/css?family=Raleway:400,300,600" rel="stylesheet" type="text/css">
    <link rel="stylesheet" href="/css/normalize.css">
    <link rel="stylesheet" href="/css/skeleton.css">
    <link rel="stylesheet" href="/src/site.scss">`;
}

// base is the site's base path, e.g. "/" or "/itpss-visualizer/", and ends with a slash
export function renderNav(base: string, active: PageKey): string {
    const items = pages.map(page => {
        const current = page.key === active ? ' aria-current="page"' : "";

        return `<li><a href="${base}${page.path}"${current}>${page.label}</a></li>`;
    }).join("\n                ");

    return `<header class="site-header">
        <nav class="site-nav container" aria-label="Main">
            <a class="site-brand" href="${base}">${site.name}</a>
            <ul>
                ${items}
            </ul>
        </nav>
    </header>`;
}

export function renderFooter(): string {
    return `<div class="container footer">
        <div class="row">
            - Design and source code by ${site.author}.
        </div>
    </div>`;
}

export function pageKeyFor(path: string): PageKey {
    if (path.includes("/department/")) {
        return "department";
    }

    return path.includes("/rankings/") ? "rankings" : "home";
}

export function applyTemplates(html: string, base: string, active: PageKey): string {
    return html
        .replace("<!-- site-head -->", renderHead())
        .replace("<!-- site-nav -->", renderNav(base, active))
        .replace("<!-- site-footer -->", renderFooter())
        .replaceAll("{{base}}", base);
}
