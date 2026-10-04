import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { HeroConfigSchema } from "@summit/hero/config";
import { renderHero } from "@summit/hero/html";
import { BrandSchema, EntitySchema } from "@summit/schemas";
import { entityJsonLd, faqJsonLd, formatHours, llmsTxt, robotsTxt, serializeJsonLd } from "@summit/seo";
import { toCssVariables } from "@summit/tokens";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]!);
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

/**
 * A stack-neutral preview built from site/*.json alone, so a new client repo
 * deploys something real before Decisions picks a stack. Always noindex.
 */
export function renderPreview(repo: string, out: string): void {
  const brand = BrandSchema.parse(readJson(join(repo, "site/brand.json")));
  const entity = EntitySchema.parse(readJson(join(repo, "site/entity.json")));
  const homePath = join(repo, "site/home.json");
  const loc = entity.locations[0]!;
  const hero = HeroConfigSchema.parse(
    existsSync(homePath)
      ? readJson(homePath).hero
      : { eyebrow: `${loc.address.locality}, ${loc.address.region}`, title: entity.name, lede: entity.description },
  );

  mkdirSync(out, { recursive: true });
  // The published CLI is a single bundle with hero.css copied beside it; in the
  // workspace the stylesheet resolves from the package.
  const bundled = fileURLToPath(new URL("./hero.css", import.meta.url));
  const heroCss = existsSync(bundled) ? bundled : createRequire(import.meta.url).resolve("@summit/hero/hero.css");
  copyFileSync(heroCss, join(out, "hero.css"));

  const jsonLd = [entityJsonLd(entity), faqJsonLd(entity)].filter(Boolean);
  const facts = [
    `<p>${esc(`${loc.address.street}, ${loc.address.locality}, ${loc.address.region} ${loc.address.postalCode}`)}</p>`,
    loc.hours.length ? `<p>Hours: ${esc(formatHours(loc.hours))}</p>` : "",
    entity.telephone ? `<p><a href="tel:${esc(entity.telephone)}">${esc(entity.telephone)}</a></p>` : "",
  ].join("");
  const faq = entity.faq.length
    ? `<section class="preview-section" aria-labelledby="faq-title"><h2 id="faq-title">Questions</h2>${entity.faq
        .map((f) => `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`)
        .join("")}</section>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(entity.name)} | intake preview</title>
<meta name="description" content="${esc(entity.description)}">
<meta name="robots" content="noindex, nofollow">
<link rel="canonical" href="${esc(entity.url)}">
<link rel="stylesheet" href="hero.css">
<style>${toCssVariables(brand)}
body { margin: 0; background: var(--summit-color-bg); color: var(--summit-color-fg); font-family: var(--summit-font-body); line-height: 1.55; }
.preview-banner { margin: 0; padding: 0.5rem 1rem; text-align: center; font-size: 0.875rem; background: var(--summit-color-fg); color: var(--summit-color-bg); }
.preview-section { max-width: 48rem; margin: 0 auto; padding: 2.5rem clamp(1rem, 5vw, 4rem); }
.preview-section h2 { font-family: var(--summit-font-display); font-weight: 400; }
a { color: var(--summit-color-primary); }
</style>
${jsonLd.map((d) => `<script type="application/ld+json">${serializeJsonLd(d)}</script>`).join("\n")}
</head>
<body>
<p class="preview-banner">Intake preview. The stack and design are chosen in the Decisions stage.</p>
<main>
${renderHero(hero)}
<section class="preview-section" aria-labelledby="visit-title"><h2 id="visit-title">Visit</h2>${facts}</section>
${faq}
</main>
</body>
</html>
`;
  writeFileSync(join(out, "index.html"), html);
  writeFileSync(join(out, "robots.txt"), robotsTxt({ mode: "preview", sitemapUrl: new URL("sitemap.xml", entity.url).href }));
  writeFileSync(join(out, "llms.txt"), llmsTxt(entity));
}
