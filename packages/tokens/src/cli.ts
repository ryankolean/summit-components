#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { BrandSchema } from "@summit/schemas";
import { checkContrast, toCssVariables } from "./index.js";

const [input, ...rest] = process.argv.slice(2);
if (!input) {
  console.error("usage: summit-tokens <brand.json> [--out tokens.css] [--selector :root]");
  process.exit(2);
}

const flag = (name: string) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};

const parsed = BrandSchema.safeParse(JSON.parse(readFileSync(input, "utf8")));
if (!parsed.success) {
  console.error(`${input} is not a valid brand:`);
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

const issues = checkContrast(parsed.data);
for (const i of issues) {
  console.error(`${i.level}: ${i.pair} is ${i.ratio}:1, needs ${i.min}:1 (${i.note})`);
}
if (issues.some((i) => i.level === "error")) process.exit(1);

const selector = flag("--selector");
const css = toCssVariables(parsed.data, selector ? { selector } : {});
const out = flag("--out");
if (out) writeFileSync(out, css);
else process.stdout.write(css);
