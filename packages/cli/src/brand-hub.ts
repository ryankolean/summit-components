import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { BrandHubSchema, BrandSchema, EntitySchema, type Brand, type BrandHub, type Entity } from "@summit/schemas";
import { contrastRatio, tailwindPreset, toCssVariables } from "@summit/tokens";

/**
 * The brand hub: one self-contained, interactive HTML page that Summit sends to
 * a client in place of a static style guide. It reads brand.json (tokens) and
 * brand-hub.json (logos, voice, imagery, rules) from a private intake folder
 * and inlines everything, logos and downloadable token files included, so the
 * page works as an email attachment, a static host upload or a local file.
 * Every section renders without JavaScript; scripts only add copy buttons, the
 * contrast checker and the type tester.
 */

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]!);
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

const MIME: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/** Families every device has; requesting them from Google Fonts only fails. */
const SYSTEM_FONTS = new Set(["system-ui", "sans-serif", "serif", "monospace", "arial", "helvetica", "georgia", "times new roman", "verdana"]);

export interface HubLogo {
  name: string;
  filename: string;
  dataUri: string;
  on: string;
  usage?: string;
}

export interface BrandHubOptions {
  /** Client intake folder: holds site/brand.json and brand-hub.json. */
  intake: string;
  /** Output directory. Defaults to <intake>/out/brand-hub (git-ignored). */
  out?: string;
  now?: Date;
}

export interface BrandHubResult {
  file: string;
  draft: boolean;
  warnings: string[];
}

// Color math --------------------------------------------------------------

function rgb(hex: string): [number, number, number] {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
}

export function colorFormats(hex: string) {
  const [r, g, b] = rgb(hex);
  const [h, s, l] = hsl(hex);
  return { hex: hex.toUpperCase(), rgb: `rgb(${r}, ${g}, ${b})`, hsl: `hsl(${h}, ${s}%, ${l}%)` };
}

/** Black or white, whichever reads better on the color. */
const inkOn = (hex: string) => (contrastRatio("#000000", hex) >= contrastRatio("#FFFFFF", hex) ? "#000000" : "#FFFFFF");

function grade(ratio: number): string {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA large";
  return "Fails";
}

const label = (role: string) => role.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

/** Every ordered pair of distinct palette colors that passes AA for body text, best first. */
export function passingPairs(brand: Brand) {
  // One entry per distinct hex, so roles that share a value (bg and onPrimary, say) are not listed twice.
  const seen = new Set<string>();
  const entries = Object.entries(brand.colors).filter(([, v]) => {
    const key = v.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const pairs: Array<{ fg: string; bg: string; ratio: number }> = [];
  for (const [bg, bgHex] of entries) {
    for (const [fg, fgHex] of entries) {
      if (fg === bg || fgHex.toLowerCase() === bgHex.toLowerCase()) continue;
      const ratio = contrastRatio(fgHex, bgHex);
      if (ratio >= 4.5) pairs.push({ fg, bg, ratio: Math.round(ratio * 100) / 100 });
    }
  }
  return pairs.sort((a, b) => b.ratio - a.ratio);
}

// Token files -------------------------------------------------------------

/** Design Tokens Community Group format, which Figma plugins such as Tokens Studio import. */
export function designTokens(brand: Brand) {
  const color = Object.fromEntries(Object.entries(brand.colors).map(([k, v]) => [k, { $type: "color", $value: v }]));
  const font = (f: Brand["fonts"]["display"]) => ({ $type: "fontFamily", $value: [f.family, ...f.fallback.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))] });
  return {
    color,
    font: { display: font(brand.fonts.display), body: font(brand.fonts.body) },
    radius: { base: { $type: "dimension", $value: brand.radius } },
  };
}

export function tokenFiles(brand: Brand): Array<{ name: string; mime: string; body: string; note: string }> {
  return [
    { name: "tokens.css", mime: "text/css", body: toCssVariables(brand), note: "CSS custom properties for any website" },
    { name: "design-tokens.json", mime: "application/json", body: `${JSON.stringify(designTokens(brand), null, 2)}\n`, note: "Design tokens for Figma (Tokens Studio) and design tools" },
    { name: "tailwind.preset.js", mime: "text/javascript", body: `export default ${JSON.stringify(tailwindPreset(brand), null, 2)};\n`, note: "Tailwind preset for developers" },
    { name: "brand.json", mime: "application/json", body: `${JSON.stringify(brand, null, 2)}\n`, note: "The source of truth these files are generated from" },
  ];
}

const dataUri = (mime: string, body: string) => `data:${mime};charset=utf-8,${encodeURIComponent(body)}`;

// Fonts -------------------------------------------------------------------

export function fontStylesheets(brand: Brand, hub: BrandHub): string[] {
  if (hub.fontStylesheets) return hub.fontStylesheets;
  const urls = new Map<string, string>();
  for (const f of [brand.fonts.display, brand.fonts.body]) {
    if (SYSTEM_FONTS.has(f.family.toLowerCase()) || urls.has(f.family)) continue;
    const weights = [...new Set(f.weights ?? [])].sort((a, b) => a - b);
    const family = f.family.replace(/ /g, "+") + (weights.length ? `:wght@${weights.join(";")}` : "");
    urls.set(f.family, `https://fonts.googleapis.com/css2?family=${family}&display=swap`);
  }
  return [...urls.values()];
}

// Logos -------------------------------------------------------------------

export function loadLogos(intake: string, hub: BrandHub, brand: Brand, warnings: string[]): HubLogo[] {
  const root = resolve(intake);
  const logos: HubLogo[] = [];
  for (const logo of hub.logos) {
    const path = resolve(root, logo.file);
    const mime = MIME[extname(path).toLowerCase()];
    if (!path.startsWith(root + sep)) {
      warnings.push(`logo "${logo.name}": ${logo.file} is outside the intake folder; skipped`);
      continue;
    }
    if (!mime) {
      warnings.push(`logo "${logo.name}": ${logo.file} is not svg, png, jpg or webp; skipped`);
      continue;
    }
    if (!existsSync(path)) {
      warnings.push(`logo "${logo.name}": ${logo.file} not found; skipped`);
      continue;
    }
    let on = logo.on;
    if (!(on in brand.colors)) {
      warnings.push(`logo "${logo.name}": color role "${on}" is not in brand.json; shown on bg`);
      on = "bg";
    }
    logos.push({
      name: logo.name,
      filename: path.slice(root.length + 1).split(sep).pop()!,
      dataUri: `data:${mime};base64,${readFileSync(path).toString("base64")}`,
      on,
      ...(logo.usage ? { usage: logo.usage } : {}),
    });
  }
  return logos;
}

// Page --------------------------------------------------------------------

interface PageInput {
  brand: Brand;
  hub: BrandHub;
  entity?: Entity;
  logos: HubLogo[];
  draft: boolean;
  date: string;
}

const pending = (draft: boolean, what: string) =>
  draft ? `<p class="hub-pending">Pending: ${esc(what)}</p>` : "";

function section(id: string, title: string, intro: string, body: string) {
  return `<section class="hub-section" id="${id}" aria-labelledby="${id}-title">
<header class="hub-section-head"><h2 id="${id}-title">${esc(title)}</h2>${intro ? `<p>${esc(intro)}</p>` : ""}</header>
${body}
</section>`;
}

function overview({ brand, hub, draft }: PageInput) {
  const strip = Object.entries(brand.colors)
    .map(([role, hex]) => `<span style="background:${hex}" title="${esc(label(role))} ${hex}"></span>`)
    .join("");
  return section(
    "overview",
    "Overview",
    "",
    `<div class="hub-overview">
<div>${hub.summary ? `<p class="hub-lede">${esc(hub.summary)}</p>` : pending(draft, "a short description of the brand and who it is for")}</div>
<div class="hub-strip" aria-hidden="true">${strip}</div>
</div>`,
  );
}

function logoSection({ brand, hub, logos, draft }: PageInput) {
  if (!logos.length && !draft) return "";
  const cards = logos
    .map(
      (l) => `<figure class="hub-card hub-logo">
<div class="hub-logo-stage" style="background:${brand.colors[l.on]}"><img src="${l.dataUri}" alt="${esc(l.name)}"></div>
<figcaption><strong>${esc(l.name)}</strong>${l.usage ? `<span>${esc(l.usage)}</span>` : ""}
<a class="hub-btn hub-btn-outline hub-btn-small" href="${l.dataUri}" download="${esc(l.filename)}">Download ${esc(extname(l.filename).slice(1).toUpperCase())}</a></figcaption>
</figure>`,
    )
    .join("");
  const rules = [hub.logoRules.clearSpace && `<li><strong>Clear space:</strong> ${esc(hub.logoRules.clearSpace)}</li>`, hub.logoRules.minSize && `<li><strong>Minimum size:</strong> ${esc(hub.logoRules.minSize)}</li>`]
    .filter(Boolean)
    .join("");
  return section(
    "logo",
    "Logo",
    "Use these files as supplied. Never redraw, stretch or recolor them.",
    `${logos.length ? `<div class="hub-grid">${cards}</div>` : pending(draft, "logo source files (SVG preferred) in assets/logos/")}${rules ? `<ul class="hub-rules">${rules}</ul>` : ""}`,
  );
}

function colorSection({ brand, hub }: PageInput) {
  const swatches = Object.entries(brand.colors)
    .map(([role, hex]) => {
      const f = colorFormats(hex);
      const ink = inkOn(hex);
      const usage = hub.colorUsage[role];
      return `<article class="hub-card hub-swatch">
<div class="hub-chip" style="background:${hex};color:${ink}"><span>${esc(label(role))}</span><span class="hub-chip-ratio">${contrastRatio(hex, brand.colors.bg).toFixed(2)}:1 on background</span></div>
<div class="hub-swatch-body">
${usage ? `<p>${esc(usage)}</p>` : ""}
<ul class="hub-values">${(["hex", "rgb", "hsl"] as const)
        .map((k) => `<li><button type="button" class="hub-copy" data-copy="${esc(f[k])}" aria-label="Copy ${esc(label(role))} ${k.toUpperCase()} ${esc(f[k])}"><span>${k.toUpperCase()}</span><code>${esc(f[k])}</code></button></li>`)
        .join("")}</ul>
<p class="hub-token"><code>var(--summit-color-${esc(role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`))})</code></p>
</div>
</article>`;
    })
    .join("");

  const pairs = passingPairs(brand)
    .map(
      (p) => `<li class="hub-pair" style="background:${brand.colors[p.bg]};color:${brand.colors[p.fg]}">
<span class="hub-pair-sample">Aa</span><span>${esc(label(p.fg))} on ${esc(label(p.bg))}</span><span class="hub-badge">${p.ratio}:1 ${grade(p.ratio)}</span></li>`,
    )
    .join("");

  const options = (selected: string) =>
    Object.entries(brand.colors)
      .map(([role, hex]) => `<option value="${hex}"${role === selected ? " selected" : ""}>${esc(label(role))} (${hex.toUpperCase()})</option>`)
      .join("");
  const checker = `<div class="hub-card hub-checker js-only">
<h3>Contrast checker</h3>
<div class="hub-checker-controls">
<label>Text<select id="cc-fg">${options("fg")}</select></label>
<label>Background<select id="cc-bg">${options("bg")}</select></label>
</div>
<div class="hub-checker-preview" id="cc-preview" style="background:${brand.colors.bg};color:${brand.colors.fg}">
<p class="hub-checker-large">Large text sample</p><p>Body text sample. The quick brown fox jumps over the lazy dog.</p>
</div>
<p class="hub-checker-result" id="cc-result" aria-live="polite"></p>
</div>`;

  return section(
    "color",
    "Color",
    "Tap any value to copy it. Contrast is measured against WCAG 2.1: AA needs 4.5:1 for body text and 3:1 for large text.",
    `<div class="hub-grid">${swatches}</div>
<h3 class="hub-sub">Text pairings that pass</h3>
${pairs ? `<ul class="hub-pairs">${pairs}</ul>` : `<p>No pair in this palette reaches 4.5:1. Use black or white text.</p>`}
${checker}`,
  );
}

function typeSection({ brand }: PageInput) {
  const fonts = [
    ["display", "Display", brand.fonts.display],
    ["body", "Body", brand.fonts.body],
  ] as const;
  const specimens = fonts
    .map(([key, name, f]) => {
      const weights = f.weights?.length ? f.weights : [400];
      return `<article class="hub-card hub-font">
<p class="hub-font-aa" style="font-family:var(--summit-font-${key})">Aa</p>
<div>
<h3>${name}: ${esc(f.family)}</h3>
<p class="hub-muted">Fallback: ${esc(f.fallback)}</p>
<ul class="hub-weights">${weights.map((w) => `<li style="font-family:var(--summit-font-${key});font-weight:${w}">${w} The quick brown fox</li>`).join("")}</ul>
</div>
</article>`;
    })
    .join("");
  const scale = [
    ["Heading 1", "var(--summit-font-display)", "clamp(2.25rem, 6vw, 3.5rem)"],
    ["Heading 2", "var(--summit-font-display)", "clamp(1.75rem, 4vw, 2.25rem)"],
    ["Heading 3", "var(--summit-font-display)", "1.5rem"],
    ["Body", "var(--summit-font-body)", "1rem"],
    ["Small", "var(--summit-font-body)", "0.875rem"],
  ]
    .map(([n, fam, size]) => `<li><span class="hub-scale-label">${n}</span><span class="hub-scale-sample" style="font-family:${fam};font-size:${size}">Built to be read</span></li>`)
    .join("");
  return section(
    "type",
    "Typography",
    "Two families carry the brand: one for headlines, one for reading.",
    `<div class="hub-grid hub-grid-2">${specimens}</div>
<div class="hub-card hub-tester js-only">
<h3>Type tester</h3>
<div class="hub-tester-controls">
<label>Your text<input id="tt-text" type="text" value="${esc(brand.name)}"></label>
<label>Size <output id="tt-size-out">48</output>px<input id="tt-size" type="range" min="14" max="120" value="48"></label>
<label>Family<select id="tt-family"><option value="display">Display</option><option value="body">Body</option></select></label>
</div>
<p class="hub-tester-out" id="tt-out" style="font-family:var(--summit-font-display)">${esc(brand.name)}</p>
</div>
<h3 class="hub-sub">Scale</h3>
<ol class="hub-scale">${scale}</ol>`,
  );
}

function componentsSection({ brand }: PageInput) {
  return section(
    "components",
    "In use",
    `How the tokens come together on screen. Corner radius: ${brand.radius}.`,
    `<div class="hub-grid hub-grid-2">
<div class="hub-card hub-demo">
<h3>Buttons and links</h3>
<p class="hub-demo-row"><a class="hub-btn" href="#components">Primary action</a><a class="hub-btn hub-btn-outline" href="#components">Secondary</a></p>
<p>Body copy with <a class="hub-link" href="#components">an inline link</a> in the brand link color.</p>
<p><span class="hub-tag">Accent tag</span></p>
</div>
<div class="hub-card hub-demo hub-demo-card">
<p class="hub-eyebrow">Card</p>
<h3 class="hub-demo-title">A headline in the display face</h3>
<p class="hub-muted">Muted supporting text for details that matter less.</p>
<label class="hub-field">Email<input type="email" placeholder="you@example.com"></label>
</div>
</div>`,
  );
}

function voiceSection({ hub, draft }: PageInput) {
  const v = hub.voice;
  if (!v.summary && !v.traits.length && !v.examples.length) {
    return draft ? section("voice", "Voice and tone", "", pending(draft, "voice traits and before and after copy examples")) : "";
  }
  const traits = v.traits
    .map(
      (t) => `<article class="hub-card hub-trait">
<h3>${esc(t.name)}</h3><p>${esc(t.description)}</p>
${t.do ? `<p class="hub-do"><strong>Do</strong> ${esc(t.do)}</p>` : ""}${t.dont ? `<p class="hub-dont"><strong>Don't</strong> ${esc(t.dont)}</p>` : ""}
</article>`,
    )
    .join("");
  const examples = v.examples
    .map(
      (e) => `<article class="hub-card hub-example"><p class="hub-eyebrow">${esc(e.context)}</p>
<p class="hub-do"><strong>Write</strong> ${esc(e.write)}</p>${e.avoid ? `<p class="hub-dont"><strong>Avoid</strong> ${esc(e.avoid)}</p>` : ""}</article>`,
    )
    .join("");
  return section(
    "voice",
    "Voice and tone",
    v.summary ?? "",
    `${traits ? `<div class="hub-grid">${traits}</div>` : ""}${examples ? `<h3 class="hub-sub">In practice</h3><div class="hub-grid hub-grid-2">${examples}</div>` : ""}`,
  );
}

function imagerySection({ hub, draft }: PageInput) {
  const i = hub.imagery;
  if (!i.summary && !i.keywords.length) return draft ? section("imagery", "Imagery", "", pending(draft, "photography and illustration direction")) : "";
  return section(
    "imagery",
    "Imagery",
    i.summary ?? "",
    i.keywords.length ? `<ul class="hub-keywords">${i.keywords.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>` : "",
  );
}

function rulesSection({ hub, draft }: PageInput) {
  const { do: dos, dont } = hub.rules;
  if (!dos.length && !dont.length) return draft ? section("rules", "Do and don't", "", pending(draft, "brand usage rules")) : "";
  const list = (items: string[], cls: string, title: string) =>
    items.length ? `<div class="hub-card ${cls}"><h3>${title}</h3><ul>${items.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>` : "";
  return section("rules", "Do and don't", "", `<div class="hub-grid hub-grid-2">${list(dos, "hub-rules-do", "Do")}${list(dont, "hub-rules-dont", "Don't")}</div>`);
}

function downloadsSection({ brand, logos }: PageInput) {
  const files = tokenFiles(brand)
    .map(
      (f) => `<li class="hub-card hub-download"><div><strong>${esc(f.name)}</strong><span class="hub-muted">${esc(f.note)}</span></div>
<a class="hub-btn hub-btn-small" href="${dataUri(f.mime, f.body)}" download="${esc(f.name)}">Download</a></li>`,
    )
    .join("");
  const logoFiles = logos
    .map((l) => `<li class="hub-card hub-download"><div><strong>${esc(l.filename)}</strong><span class="hub-muted">${esc(l.name)}</span></div><a class="hub-btn hub-btn-small" href="${l.dataUri}" download="${esc(l.filename)}">Download</a></li>`)
    .join("");
  const css = tokenFiles(brand)[0]!.body;
  return section(
    "downloads",
    "Downloads",
    "Hand these to anyone building for the brand. They all come from the same source, so they always agree.",
    `<ul class="hub-downloads">${files}${logoFiles}</ul>
<details class="hub-card hub-code"><summary>View tokens.css</summary><pre><code>${esc(css)}</code></pre>
<button type="button" class="hub-btn hub-btn-outline hub-btn-small hub-copy js-only" data-copy="${esc(css)}">Copy CSS</button></details>`,
  );
}

const NAV: Array<[string, string]> = [
  ["overview", "Overview"],
  ["logo", "Logo"],
  ["color", "Color"],
  ["type", "Type"],
  ["components", "In use"],
  ["voice", "Voice"],
  ["imagery", "Imagery"],
  ["rules", "Do and don't"],
  ["downloads", "Downloads"],
];

const STYLE = `
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:4.5rem;-webkit-text-size-adjust:100%}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--summit-color-bg,#fff);color:var(--summit-color-fg,#111);font-family:var(--summit-font-body,system-ui,sans-serif);line-height:1.55;
--hub-surface:color-mix(in srgb,var(--summit-color-fg,#111) 5%,var(--summit-color-bg,#fff));
--hub-line:color-mix(in srgb,var(--summit-color-fg,#111) 14%,var(--summit-color-bg,#fff));
--hub-link:var(--summit-color-link,var(--summit-color-primary,#111))}
h1,h2,h3{font-family:var(--summit-font-display,system-ui,sans-serif);line-height:1.15;margin:0 0 .5rem;overflow-wrap:anywhere}
h3{font-size:1.125rem}
p{margin:0 0 .75rem}
img{max-width:100%}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em}
.hub-draft{margin:0;padding:.5rem 1rem;text-align:center;font-size:.875rem;background:var(--summit-color-accent,#fc0);color:${"$"}{accentInk}}
.hub-hero{background:var(--summit-color-primary,#111);color:var(--summit-color-on-primary,#fff);padding:clamp(2.5rem,8vw,5rem) clamp(1rem,5vw,3rem)}
.hub-hero-inner{max-width:72rem;margin:0 auto;display:grid;gap:1.5rem}
.hub-hero-logo{max-height:5rem;width:auto;justify-self:start;padding:.75rem;border-radius:var(--summit-radius,0)}
.hub-hero h1{font-size:clamp(2.5rem,8vw,5rem);margin:0}
.hub-hero .hub-tagline{font-size:clamp(1.125rem,2.5vw,1.5rem);margin:0;max-width:40rem;opacity:.9}
.hub-meta{font-size:.875rem;opacity:.75;margin:0}
.hub-nav{position:sticky;top:0;z-index:10;background:var(--summit-color-bg,#fff);border-bottom:1px solid var(--hub-line)}
.hub-nav ul{list-style:none;margin:0 auto;padding:.5rem clamp(1rem,5vw,3rem);max-width:72rem;display:flex;gap:.25rem;overflow-x:auto;scrollbar-width:none}
.hub-nav ul::-webkit-scrollbar{display:none}
.hub-nav a{display:block;white-space:nowrap;padding:.5rem .75rem;border-radius:999px;color:inherit;text-decoration:none;font-size:.9rem}
.hub-nav a:hover,.hub-nav a:focus-visible,.hub-nav a[aria-current]{background:var(--hub-surface);outline-offset:2px}
.hub-nav a[aria-current]{font-weight:600}
main{max-width:72rem;margin:0 auto;padding:0 clamp(1rem,5vw,3rem)}
.hub-section{padding:clamp(2.5rem,6vw,4.5rem) 0;border-bottom:1px solid var(--hub-line)}
.hub-section:last-child{border-bottom:0}
.hub-section-head{max-width:44rem;margin-bottom:1.75rem}
.hub-section-head h2{font-size:clamp(1.75rem,4vw,2.5rem)}
.hub-section-head p,.hub-muted{color:var(--summit-color-muted,#555)}
.hub-sub{margin:2.5rem 0 1rem}
.hub-lede{font-size:clamp(1.125rem,2.2vw,1.375rem);max-width:44rem}
.hub-overview{display:grid;gap:2rem}
.hub-strip{display:flex;height:4rem;border-radius:var(--summit-radius,0);overflow:hidden;border:1px solid var(--hub-line)}
.hub-strip span{flex:1}
.hub-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))}
.hub-grid-2{grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr))}
.hub-card{background:var(--hub-surface);border:1px solid var(--hub-line);border-radius:var(--summit-radius,0);padding:1.25rem;margin:0;min-width:0}
.hub-logo{padding:0;overflow:hidden}
.hub-logo-stage{display:grid;place-items:center;min-height:11rem;padding:2rem}
.hub-logo-stage img{max-height:7rem;width:auto}
.hub-logo figcaption{display:flex;flex-direction:column;gap:.5rem;align-items:flex-start;padding:1rem 1.25rem}
.hub-rules{margin-top:1.25rem}
.hub-swatch{padding:0;overflow:hidden}
.hub-chip{height:8rem;padding:1rem;display:flex;flex-direction:column;justify-content:space-between;font-weight:600}
.hub-chip-ratio{font-size:.8rem;font-weight:400;opacity:.85}
.hub-swatch-body{padding:1rem}
.hub-values{list-style:none;margin:0 0 .5rem;padding:0;display:grid;gap:.25rem}
.hub-copy{all:unset;box-sizing:border-box;cursor:pointer;display:flex;gap:.75rem;width:100%;padding:.35rem .5rem;border-radius:.375rem}
.hub-copy:hover,.hub-copy:focus-visible{background:var(--hub-line)}
.hub-copy:focus-visible{outline:2px solid var(--hub-link)}
.hub-copy span{width:2.5rem;font-size:.75rem;letter-spacing:.06em;color:var(--summit-color-muted,#555);align-self:center}
.hub-token{margin:0;font-size:.8rem;color:var(--summit-color-muted,#555);overflow-wrap:anywhere}
.hub-pairs{list-style:none;padding:0;margin:0;display:grid;gap:.5rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))}
.hub-pair{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;border-radius:var(--summit-radius,0);border:1px solid var(--hub-line);font-size:.9rem}
.hub-pair-sample{font-family:var(--summit-font-display,serif);font-size:1.5rem;line-height:1}
.hub-badge{margin-left:auto;font-size:.75rem;white-space:nowrap;font-weight:600}
.hub-checker{margin-top:2rem}
.hub-checker-controls,.hub-tester-controls{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr));margin:1rem 0}
label{display:grid;gap:.35rem;font-size:.875rem;font-weight:600}
select,input{font:inherit;font-weight:400;padding:.6rem .75rem;border:1px solid var(--hub-line);border-radius:var(--summit-radius,0);background:var(--summit-color-bg,#fff);color:var(--summit-color-fg,#111);min-width:0;width:100%}
input[type=range]{padding:0;accent-color:var(--summit-color-primary,#111)}
.hub-checker-preview{padding:1.5rem;border-radius:var(--summit-radius,0);border:1px solid var(--hub-line)}
.hub-checker-large{font-size:1.5rem;font-family:var(--summit-font-display,serif)}
.hub-checker-result{margin:.75rem 0 0;font-weight:600}
.hub-font{display:flex;gap:1.5rem;align-items:flex-start}
.hub-font-aa{font-size:clamp(4rem,10vw,6rem);line-height:1;margin:0}
.hub-weights{list-style:none;padding:0;margin:0;display:grid;gap:.25rem}
.hub-tester{margin-top:1rem}
.hub-tester-out{font-size:48px;line-height:1.1;margin:0;overflow-wrap:anywhere}
.hub-scale{list-style:none;padding:0;margin:0}
.hub-scale li{display:flex;gap:1rem;align-items:baseline;padding:.75rem 0;border-bottom:1px solid var(--hub-line);min-width:0}
.hub-scale-label{flex:0 0 5.5rem;font-size:.8rem;color:var(--summit-color-muted,#555)}
.hub-scale-sample{min-width:0;overflow-wrap:anywhere}
.hub-demo-row{display:flex;flex-wrap:wrap;gap:.75rem}
.hub-btn{display:inline-block;padding:.75rem 1.25rem;border-radius:var(--summit-radius,0);background:var(--summit-color-primary,#111);color:var(--summit-color-on-primary,#fff);text-decoration:none;font-weight:600;border:2px solid var(--summit-color-primary,#111);cursor:pointer;font:inherit;font-weight:600}
.hub-btn-outline{background:transparent;color:var(--hub-link);border-color:currentColor}
.hub-btn-small{padding:.4rem .85rem;font-size:.875rem}
.hub-btn:focus-visible,.hub-link:focus-visible{outline:2px solid var(--hub-link);outline-offset:3px}
.hub-link,main a:not([class]){color:var(--hub-link)}
.hub-tag{display:inline-block;padding:.25rem .75rem;border-radius:999px;background:var(--summit-color-accent,#fc0);color:${"$"}{accentInk};font-size:.8rem;font-weight:600}
.hub-demo-card{background:var(--summit-color-bg,#fff)}
.hub-eyebrow{font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:var(--summit-color-muted,#555);margin-bottom:.5rem}
.hub-demo-title{font-size:1.5rem}
.hub-field{margin-top:1rem}
.hub-do,.hub-dont{padding-left:.75rem;border-left:3px solid;margin-top:.5rem}
.hub-do{border-color:#1a7f37}
.hub-dont{border-color:#cf222e}
.hub-do strong,.hub-dont strong{display:block;font-size:.75rem;letter-spacing:.06em;text-transform:uppercase}
.hub-keywords{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:.5rem}
.hub-keywords li{padding:.4rem .9rem;border:1px solid var(--hub-line);border-radius:999px;background:var(--hub-surface)}
.hub-rules-do{border-top:4px solid #1a7f37}
.hub-rules-dont{border-top:4px solid #cf222e}
.hub-rules-do ul,.hub-rules-dont ul{margin:0;padding-left:1.1rem;display:grid;gap:.4rem}
.hub-downloads{list-style:none;padding:0;margin:0;display:grid;gap:.75rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr))}
.hub-download{display:flex;align-items:center;justify-content:space-between;gap:1rem}
.hub-download div{display:grid;min-width:0}
.hub-download strong{overflow-wrap:anywhere}
.hub-code{margin-top:1rem}
.hub-code summary{cursor:pointer;font-weight:600}
.hub-code pre{overflow-x:auto;font-size:.8rem;margin:1rem 0}
.hub-pending{padding:1rem;border:2px dashed var(--hub-line);border-radius:var(--summit-radius,0);color:var(--summit-color-muted,#555)}
.hub-footer{max-width:72rem;margin:0 auto;padding:2rem clamp(1rem,5vw,3rem) 3rem;font-size:.875rem;color:var(--summit-color-muted,#555);display:flex;flex-wrap:wrap;gap:.5rem 1.5rem}
.hub-footer a{color:var(--hub-link)}
.hub-toast{position:fixed;left:50%;bottom:1.5rem;transform:translate(-50%,1rem);opacity:0;pointer-events:none;background:var(--summit-color-fg,#111);color:var(--summit-color-bg,#fff);padding:.6rem 1rem;border-radius:999px;font-size:.875rem;transition:opacity .2s,transform .2s}
.hub-toast.is-on{opacity:1;transform:translate(-50%,0)}
.js-only{display:none}
.js .js-only{display:block}
.js .hub-copy.js-only{display:inline-block}
@media (max-width:40rem){.hub-font{flex-direction:column;gap:.5rem}.hub-scale li{flex-direction:column;gap:.25rem}.hub-scale-label{flex:none}}
@media print{.hub-nav,.js-only,.hub-toast,.hub-btn,.hub-draft{display:none!important}.hub-section{break-inside:avoid-page}.hub-card{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

const SCRIPT = `
(function(){
document.documentElement.classList.add('js');
var toast=document.getElementById('hub-toast');var t;
function say(m){toast.textContent=m;toast.classList.add('is-on');clearTimeout(t);t=setTimeout(function(){toast.classList.remove('is-on')},1600)}
document.addEventListener('click',function(e){var b=e.target.closest('[data-copy]');if(!b)return;var v=b.getAttribute('data-copy');
var done=function(){say('Copied '+(v.length>40?'to clipboard':v))};
if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(v).then(done,function(){fallback(v);done()})}else{fallback(v);done()}});
function fallback(v){var a=document.createElement('textarea');a.value=v;a.setAttribute('readonly','');a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(_){}a.remove()}
function lum(h){h=h.slice(1);if(h.length===3)h=h.replace(/./g,'$&$&');var n=parseInt(h,16);return [n>>16&255,n>>8&255,n&255].map(function(v){v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)}).reduce(function(s,v,i){return s+v*[0.2126,0.7152,0.0722][i]},0)}
function ratio(a,b){var x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
var fg=document.getElementById('cc-fg'),bg=document.getElementById('cc-bg'),pv=document.getElementById('cc-preview'),res=document.getElementById('cc-result');
function check(){if(!fg)return;var r=ratio(fg.value,bg.value);pv.style.color=fg.value;pv.style.background=bg.value;
res.textContent=r.toFixed(2)+':1. Body text: '+(r>=7?'AAA':r>=4.5?'AA':'fails')+'. Large text: '+(r>=4.5?'AAA':r>=3?'AA':'fails')+'.'}
if(fg){fg.addEventListener('change',check);bg.addEventListener('change',check);check()}
var tx=document.getElementById('tt-text'),sz=document.getElementById('tt-size'),so=document.getElementById('tt-size-out'),fm=document.getElementById('tt-family'),out=document.getElementById('tt-out');
function type(){if(!out)return;out.textContent=tx.value||' ';out.style.fontSize=sz.value+'px';so.textContent=sz.value;out.style.fontFamily='var(--summit-font-'+fm.value+')'}
if(tx){[tx,sz,fm].forEach(function(el){el.addEventListener('input',type)});type()}
var links=[].slice.call(document.querySelectorAll('.hub-nav a'));
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(!en.isIntersecting)return;links.forEach(function(l){if(l.getAttribute('href')==='#'+en.target.id){l.setAttribute('aria-current','true');l.scrollIntoView({block:'nearest',inline:'nearest'})}else l.removeAttribute('aria-current')})})},{rootMargin:'-40% 0px -55% 0px'});
document.querySelectorAll('.hub-section').forEach(function(s){io.observe(s)})}
})();
`;

export function brandHubHtml(input: PageInput): string {
  const { brand, hub, entity, logos, draft, date } = input;
  const accentInk = inkOn(brand.colors.accent);
  const heroLogo = logos.find((l) => l.on === "primary") ?? logos[0];
  const sections = [
    overview(input),
    logoSection(input),
    colorSection(input),
    typeSection(input),
    componentsSection(input),
    voiceSection(input),
    imagerySection(input),
    rulesSection(input),
    downloadsSection(input),
  ];
  const present = new Set([...sections.join("").matchAll(/<section class="hub-section" id="([a-z]+)"/g)].map((m) => m[1]));
  const nav = NAV.filter(([id]) => present.has(id))
    .map(([id, name]) => `<li><a href="#${id}">${name}</a></li>`)
    .join("");
  const tagline = hub.tagline ?? entity?.description;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(brand.name)} brand hub</title>
<meta name="description" content="${esc(`Brand guidelines, assets and design tokens for ${brand.name}.`)}">
<meta name="robots" content="noindex, nofollow">
${fontStylesheets(brand, hub)
    .map((href) => `<link rel="stylesheet" href="${esc(href)}">`)
    .join("\n")}
<style>${toCssVariables(brand)}${STYLE.replaceAll("${accentInk}", accentInk)}</style>
</head>
<body>
${draft ? `<p class="hub-draft">Draft for review. Sections marked pending are still being collected.</p>` : ""}
<header class="hub-hero">
<div class="hub-hero-inner">
${heroLogo ? `<img class="hub-hero-logo" src="${heroLogo.dataUri}" alt="${esc(brand.name)} logo" style="background:${brand.colors[heroLogo.on]}">` : ""}
<p class="hub-meta">Brand hub</p>
<h1>${esc(brand.name)}</h1>
${tagline ? `<p class="hub-tagline">${esc(tagline)}</p>` : ""}
<p class="hub-meta">Version ${esc(hub.version)}, updated ${esc(date)}</p>
</div>
</header>
<nav class="hub-nav" aria-label="Brand hub sections"><ul>${nav}</ul></nav>
<main>
${sections.filter(Boolean).join("\n")}
</main>
<footer class="hub-footer"><span>${esc(hub.preparedBy)}</span><span>${esc(brand.name)} brand hub, version ${esc(hub.version)}</span>${entity ? `<a href="${esc(entity.url)}">${esc(entity.url.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : ""}</footer>
<div class="hub-toast" id="hub-toast" role="status" aria-live="polite"></div>
<script>${SCRIPT}</script>
</body>
</html>
`;
}

function dropEmpty(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropEmpty).filter((v) => v !== undefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, dropEmpty(v)]).filter(([, v]) => v !== undefined));
  }
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

/**
 * Builds <out>/index.html from an intake folder. Reads brand-hub.json, or
 * brand-hub.draft.json with a draft banner and pending markers when the final
 * file does not exist yet.
 */
export function renderBrandHub(options: BrandHubOptions): BrandHubResult {
  const intake = resolve(options.intake);
  const warnings: string[] = [];
  const brandPath = join(intake, "site/brand.json");
  if (!existsSync(brandPath)) throw new Error(`${brandPath} not found. Finish intake first: brand.json must be valid.`);
  const brand = BrandSchema.parse(readJson(brandPath));

  const finalPath = join(intake, "brand-hub.json");
  const draftPath = join(intake, "brand-hub.draft.json");
  const draft = !existsSync(finalPath);
  // The intake draft ships with empty strings to fill in; an empty string means "not yet".
  const hub = BrandHubSchema.parse(dropEmpty(existsSync(finalPath) ? readJson(finalPath) : existsSync(draftPath) ? readJson(draftPath) : {}));
  if (draft && !existsSync(draftPath)) warnings.push("no brand-hub.json or brand-hub.draft.json; rendered tokens only");

  const entityPath = join(intake, "site/entity.json");
  const entityResult = existsSync(entityPath) ? EntitySchema.safeParse(readJson(entityPath)) : undefined;
  const entity = entityResult?.success ? entityResult.data : undefined;

  const logos = loadLogos(intake, hub, brand, warnings);
  for (const role of Object.keys(hub.colorUsage)) if (!(role in brand.colors)) warnings.push(`colorUsage.${role}: no such color role in brand.json`);
  const date = (options.now ?? new Date()).toISOString().slice(0, 10);

  const out = resolve(options.out ?? join(intake, "out/brand-hub"));
  mkdirSync(out, { recursive: true });
  const file = join(out, "index.html");
  writeFileSync(file, brandHubHtml({ brand, hub, ...(entity ? { entity } : {}), logos, draft, date }));
  return { file, draft, warnings };
}

/** Starter content written by intake, filled in from the owner's answers and renamed to brand-hub.json. */
export function brandHubDraft(brand: Brand | undefined, entity: Entity | undefined) {
  return {
    tagline: entity?.description ?? "",
    summary: "",
    version: "1.0",
    logos: [{ name: "Primary logo", file: "assets/logos/primary.svg", on: "bg", usage: "" }],
    logoRules: { clearSpace: "", minSize: "" },
    colorUsage: Object.fromEntries(Object.keys(brand?.colors ?? { bg: "", fg: "", muted: "", primary: "", onPrimary: "", accent: "" }).map((k) => [k, ""])),
    voice: { summary: "", traits: [], examples: [] },
    imagery: { summary: "", keywords: [] },
    rules: { do: [], dont: [] },
  };
}
