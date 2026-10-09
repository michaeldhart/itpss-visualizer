import { defineConfig } from "vite";

// Relative base so the build works from a GitHub Pages project path (user.github.io/itpss-visualizer/).
export default defineConfig({
    base: "./",
    build: { outDir: "dist" }
});
