// Generates example/index.html and example/tokens.css from the built package.
// CI regenerates and fails on a diff, so the committed example cannot drift.
import { readFileSync, writeFileSync } from "node:fs";
import { BrandSchema } from "@summit/schemas";
import { checkContrast, toCssVariables } from "@summit/tokens";
import { renderHero } from "../dist/html.js";

const here = new URL("./", import.meta.url);
const brand = BrandSchema.parse(JSON.parse(readFileSync(new URL("brand.json", here), "utf8")));
const errors = checkContrast(brand).filter((i) => i.level === "error");
if (errors.length) throw new Error(`example brand fails contrast: ${JSON.stringify(errors)}`);
writeFileSync(new URL("tokens.css", here), toCssVariables(brand));

const prerendered = {
  eyebrow: "Ferndale, Michigan",
  title: "Breakfast worth getting up for",
  lede: "Scratch cooking, strong coffee and a menu that changes with what is good this week.",
  primaryCta: { label: "See the menu", href: "#menu" },
  secondaryCta: { label: "Get directions", href: "#visit" },
  image: { src: "media.svg", alt: "Illustrated sun over rolling hills", width: 1200, height: 900 },
};

const fromConfig = {
  id: "catering",
  headingLevel: 2,
  align: "center",
  eyebrow: "Rendered by the custom element",
  title: "Catering for fifty or five hundred",
  lede: "This hero has no markup in the page. <summit-hero> builds it from data-config, the fallback for pages that cannot hold pasted HTML.",
  primaryCta: { label: "Start an inquiry", href: "mailto:hello@example.com" },
};

const attr = (value) => value.replace(/&/g, "&amp;").replace(/'/g, "&#39;");

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@summit/hero example</title>
<meta name="description" content="The Summit hero rendered with no build step: pasted HTML and the custom element.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz@9..144&family=Jost:wght@400;600&display=swap">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="../src/hero.css">
<style>
  body { margin: 0; background: var(--summit-color-bg); }
  .note { max-width: 40rem; margin: 0 auto; padding: 1rem clamp(1rem, 5vw, 4rem); font: 0.875rem/1.5 var(--summit-font-body); color: var(--summit-color-muted); }
  hr { border: 0; border-top: 1px solid color-mix(in srgb, var(--summit-color-fg) 15%, transparent); margin: 0; }
</style>
</head>
<body>
<summit-hero>${renderHero(prerendered)}</summit-hero>
<p class="note">Above: <code>renderHero()</code> output pasted into the page. The content is in the HTML, so crawlers and answer engines read it with no JavaScript.</p>
<hr>
<summit-hero data-config='${attr(JSON.stringify(fromConfig))}'></summit-hero>
<script type="module" src="../dist/embed.js"></script>
</body>
</html>
`;

writeFileSync(new URL("index.html", here), page);
console.log("wrote example/index.html and example/tokens.css");
