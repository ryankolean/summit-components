// Builds every site template in preview and production mode, gates each build
// with @summit/checks, and asserts each template renders the hero exactly as
// renderHero() does. Runs after `pnpm build` (it imports the built packages).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { formatReport, loadSite, runChecks } from "@summit/checks";
import { HeroConfigSchema } from "@summit/hero";
import { renderHero } from "@summit/hero/html";

const root = new URL("../", import.meta.url);

const TEMPLATES = [
  { name: "astro-site", out: "dist", env: {}, allowNoindex: [] },
  // Next exports its built-in 404 page as /_not-found/ with noindex, by design.
  { name: "next-site", out: "out", env: { STATIC_EXPORT: "1" }, allowNoindex: ["/_not-found/"] },
];

const heroVersion = JSON.parse(readFileSync(new URL("packages/hero/package.json", root), "utf8")).version;
let failed = false;

for (const template of TEMPLATES) {
  const dir = new URL(`templates/${template.name}/`, root);
  const outDir = fileURLToPath(new URL(template.out, dir));
  const home = JSON.parse(readFileSync(new URL("site/home.json", dir), "utf8"));
  const linked = JSON.parse(readFileSync(new URL("node_modules/@summit/hero/package.json", dir), "utf8")).version;

  for (const mode of ["preview", "production"]) {
    try {
      execFileSync("pnpm", ["run", "build"], {
        cwd: dir,
        env: { ...process.env, ...template.env, SITE_MODE: mode },
        stdio: "pipe",
      });
    } catch (error) {
      console.error(`${template.name} (${mode}): build failed\n${error.stdout}\n${error.stderr}`);
      failed = true;
      continue;
    }

    const report = runChecks(loadSite(outDir), { mode, allowNoindex: template.allowNoindex });
    const passing = report.checks.filter((c) => c.status === "pass").length;
    console.log(
      `${template.name} (${mode}): ${report.pageCount} pages, ${passing}/${report.checks.length} checks passing, ` +
        `${report.errorCount} errors, ${report.warningCount} warnings`,
    );
    if (report.errorCount) {
      console.error(formatReport(report));
      failed = true;
    }

    if (mode === "production") {
      const html = readFileSync(`${outDir}/index.html`, "utf8");
      const rendered = html.match(/<section class="summit-hero[\s\S]*?<\/section>/)?.[0];
      const expected = renderHero(HeroConfigSchema.parse(home.hero));
      if (rendered === expected) {
        console.log(`${template.name}: hero markup identical to renderHero() (@summit/hero ${linked})`);
      } else {
        console.error(`${template.name}: hero markup differs from renderHero()\n  got:      ${rendered}\n  expected: ${expected}`);
        failed = true;
      }
      if (linked !== heroVersion) {
        console.error(`${template.name}: uses @summit/hero ${linked}, workspace has ${heroVersion}`);
        failed = true;
      }
    }
  }
}

process.exit(failed ? 1 : 0);
