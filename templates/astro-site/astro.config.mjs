import { readFileSync } from "node:fs";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const entity = JSON.parse(readFileSync(new URL("./site/entity.json", import.meta.url), "utf8"));

// SITE_URL and BASE_PATH override entity.url for previews served from a sub-path,
// e.g. SITE_URL=https://ryankolean.github.io BASE_PATH=/client-site/.
export default defineConfig({
  site: process.env.SITE_URL ?? entity.url,
  base: process.env.BASE_PATH ?? "/",
  integrations: [react(), sitemap()],
});
