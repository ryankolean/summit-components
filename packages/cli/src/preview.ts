import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { HeroConfigSchema } from "@summit/hero/config";
import { renderHero } from "@summit/hero/html";
import { BrandSchema, EntitySchema } from "@summit/schemas";
import { entityJsonLd, faqJsonLd, formatHours, llmsTxt, robotsTxt, serializeJsonLd } from "@summit/seo";
import { checkContrast, contrastRatio, toCssVariables } from "@summit/tokens";
import type { Brand, Entity } from "@summit/schemas";

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
  mkdirSync(join(out, "style-guide"), { recursive: true });
  writeFileSync(join(out, "style-guide/index.html"), styleGuideHtml(brand, entity));
  writeFileSync(join(out, "robots.txt"), robotsTxt({ mode: "preview", sitemapUrl: new URL("sitemap.xml", entity.url).href }));
  writeFileSync(join(out, "llms.txt"), llmsTxt(entity));
}

const ROLES: Record<string, string> = {
  bg: "Page background",
  fg: "Body text",
  muted: "Secondary text",
  primary: "Links and buttons",
  onPrimary: "Text on primary buttons",
  accent: "Highlights, used as a ground and not as text",
};

/**
 * The public style guide, built from brand.json alone so it is safe to share:
 * palette roles with contrast, type and radius. Private brand notes (voice,
 * licences) stay in the intake repo's style-guide.md.
 */
export function styleGuideHtml(brand: Brand, entity: Entity): string {
  const swatches = Object.entries(brand.colors)
    .map(([role, hex]) => {
      const ratio = contrastRatio(hex, brand.colors.bg).toFixed(2);
      return `<tr><td><span class="swatch" style="background:${hex}"></span></td><th scope="row">${esc(role)}</th><td><code>${hex}</code></td><td>${esc(ROLES[role] ?? "Site-specific color")}</td><td>${ratio}:1</td></tr>`;
    })
    .join("\n");
  const issues = checkContrast(brand);
  const contrast = issues.length
    ? `<ul>${issues.map((i) => `<li>${esc(i.pair)}: ${i.ratio}:1, needs ${i.min}:1 (${esc(i.note)})</li>`).join("")}</ul>`
    : "<p>Every text pair meets WCAG AA (4.5:1).</p>";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(entity.name)} | style guide preview</title>
<meta name="description" content="Colors, type and brand rules for the ${esc(entity.name)} website.">
<meta name="robots" content="noindex, nofollow">
<style>${toCssVariables(brand)}
body { margin: 0; background: var(--summit-color-bg); color: var(--summit-color-fg); font-family: var(--summit-font-body); line-height: 1.55; }
main { max-width: 48rem; margin: 0 auto; padding: 2.5rem clamp(1rem, 5vw, 4rem); }
h1, h2 { font-family: var(--summit-font-display); font-weight: 400; }
a { color: var(--summit-color-primary); }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.5rem; border-bottom: 1px solid var(--summit-color-muted); text-align: left; vertical-align: middle; }
.swatch { display: block; width: 2.5rem; height: 2.5rem; border: 1px solid var(--summit-color-muted); border-radius: var(--summit-radius); }
.display { font-family: var(--summit-font-display); font-size: 2rem; margin: 0.25rem 0; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.button { display: inline-block; padding: 0.6rem 1.1rem; background: var(--summit-color-primary); color: var(--summit-color-on-primary); border-radius: var(--summit-radius); text-decoration: none; }
</style>
</head>
<body>
<main>
<p><a href="../">Back to the preview</a></p>
<h1>${esc(entity.name)} style guide</h1>
<p>Every component styles itself from these roles, so the site stays on brand as it grows.</p>
<h2>Colors</h2>
<div class="table-wrap"><table>
<thead><tr><th scope="col"><span class="visually-hidden">Swatch</span></th><th scope="col">Role</th><th scope="col">Value</th><th scope="col">Use</th><th scope="col">Contrast on background</th></tr></thead>
<tbody>
${swatches}
</tbody>
</table></div>
<h2>Contrast</h2>
${contrast}
<h2>Type</h2>
<p>Display: ${esc(brand.fonts.display.family)}</p>
<p class="display">${esc(entity.name)}</p>
<p>Body: ${esc(brand.fonts.body.family)}. ${esc(entity.description)}</p>
<h2>Buttons</h2>
<p><a class="button" href="../">Primary action</a></p>
<p>Corner radius: <code>${esc(brand.radius)}</code></p>
</main>
</body>
</html>
`;
}
