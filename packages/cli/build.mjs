// Bundles the summit command into one dependency-free file. Client CI installs
// it with `npm install --global github:...#cli-vX`, and npm cannot install a
// global package whose own dependencies are git dependencies, so the CLI ships
// with everything inlined and no dependencies at all.
import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { build } from "esbuild";

await build({
  entryPoints: ["src/cli.ts"],
  outfile: "dist/summit.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  conditions: ["source"],
  banner: {
    // Bundled CommonJS dependencies call require(); give them one in ESM. The
    // shebang comes from src/cli.ts, which esbuild keeps on the first line.
    js: "import { createRequire as __summitRequire } from 'node:module';\nconst require = __summitRequire(import.meta.url);",
  },
  logLevel: "warning",
});

copyFileSync(createRequire(import.meta.url).resolve("@summit/hero/hero.css"), "dist/hero.css");
// `summit decide validate` checks site.config.json against the registry this CLI shipped with.
copyFileSync("../../registry.json", "dist/registry.json");
console.log("bundled dist/summit.js");
