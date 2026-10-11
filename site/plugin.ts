import type { Plugin } from "vite";
import { applyTemplates, pageKeyFor } from "./html.ts";

export function siteHtml(): Plugin {
    let base = "/";

    return {
        name: "site-html",
        configResolved(config) {
            base = config.base;
        },
        transformIndexHtml: {
            order: "pre",
            handler(html, context) {
                return applyTemplates(html, base, pageKeyFor((context.filename ?? context.path).replaceAll("\\", "/")));
            }
        }
    };
}
