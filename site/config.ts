// What the pages share: the site's name and the pages the nav links to.
export const site = {
    name: "Illinois Stop Data",
    tagline: "Illinois traffic and pedestrian stop data, made visual",
    author: "Michael D. Hart"
};

export type PageKey = "home" | "department" | "rankings";

export interface SitePage {
    key: PageKey;
    // text in the nav bar
    label: string;
    // where it lives under the site's base path
    path: string;
}

export const pages: SitePage[] = [
    { key: "home", label: "Home", path: "" },
    { key: "department", label: "Your Department", path: "department/" },
    { key: "rankings", label: "Rankings", path: "rankings/" }
];
