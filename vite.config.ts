import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { siteHtml } from "./site/plugin.ts";

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// GitHub Pages serves the site from a folder named after the repository (user.github.io/<repo>/), so the deploy
// sets BASE_PATH to "/<repo>/". Locally it is "/".
export default defineConfig(({ mode }) => ({
    base: loadEnv(mode, ".", "").BASE_PATH || "/",
    appType: "mpa",
    plugins: [siteHtml()],
    build: {
        outDir: "dist",
        rollupOptions: {
            input: {
                home: page("./index.html"),
                department: page("./department/index.html"),
                rankings: page("./rankings/index.html")
            }
        }
    }
}));
