import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BrandSchema, EntitySchema } from "@summit/schemas";
import { extractBrand, extractEntity, parseCss, resolveValue } from "../src/extract.js";

const site = fileURLToPath(new URL("./fixtures/site/", import.meta.url));

describe("parseCss and resolveValue", () => {
  const rules = parseCss(`
    /* comment { not a rule } */
    :root { --a: #112233; --b: var(--a); --c: var(--missing, #ABCDEF); }
    @media (min-width: 1px) { .x { color: red; } }
  `);

  it("finds rules inside at-rules and ignores comments", () => {
    expect(rules.map((r) => r.selector)).toEqual([":root", ".x"]);
  });

  it("does not swallow a rule that follows an @import statement (Umbo regression)", () => {
    const parsed = parseCss(`@import url('https://fonts.example/css?family=A:wght@400;700&display=swap');\n\n:root { --a: #000; }`);
    expect(parsed.map((r) => r.selector)).toEqual([":root"]);
  });

  it("resolves nested variables and fallbacks", () => {
    const vars = new Map(Object.entries(rules[0]!.decls));
    expect(resolveValue("var(--b)", vars)).toBe("#112233");
    expect(resolveValue("var(--c)", vars)).toBe("#ABCDEF");
  });
});

describe("extractBrand", () => {
  const { brand, roles } = extractBrand(site, "Shellfish Bar");

  it("produces a schema-valid brand", () => {
    expect(BrandSchema.safeParse(brand).success).toBe(true);
  });

  it("measures page, text and button colors from the rules that use them", () => {
    expect(brand.colors.bg).toBe("#E8E3CE");
    expect(brand.colors.fg).toBe("#2E241A");
    expect(brand.colors.primary).toBe("#2B2117");
    expect(brand.colors.onPrimary).toBe("#F1EDDD");
    expect(roles.primary).toMatchObject({ source: ".btn background", measured: true });
  });

  it("takes the accent from a button variant", () => {
    expect(brand.colors.accent).toBe("#D3A75A");
    expect(roles.accent?.source).toBe(".btn--gold background");
  });

  it("takes primary and onPrimary from a primary variant when the base button has no background (Roses regression)", () => {
    const dir = mkdtempSync(join(tmpdir(), "summit-extract-"));
    writeFileSync(join(dir, "index.html"), "<!doctype html><html><head><title>Variant Bar</title></head><body></body></html>");
    writeFileSync(
      join(dir, "style.css"),
      `:root { --paper: #F5F1EA; --wine: #8A1C2B; --flame: #F28C4B; --pine: #26302A; --plum: #5A1E4A; }
       body { background: var(--paper); color: var(--wine); }
       .btn { display: inline-block; border: 1px solid transparent; }
       .btn--primary { background: var(--flame); color: var(--pine); }
       .btn--primary:hover { background: #E07A3A; }
       .btn--secondary { background: transparent; color: var(--wine); }`,
    );
    const { brand: b, roles: r } = extractBrand(dir, "Variant Bar");
    expect(b.colors.primary).toBe("#F28C4B");
    expect(b.colors.onPrimary).toBe("#26302A");
    expect(r.primary).toMatchObject({ source: ".btn--primary background", measured: true });
    expect(r.onPrimary).toMatchObject({ source: ".btn--primary color", measured: true });
    expect(b.colors.accent).not.toBe(b.colors.primary);
    expect(b.colors.accent).not.toBe(b.colors.fg);
  });

  it("prefers a primary variant over the base button background", () => {
    const dir = mkdtempSync(join(tmpdir(), "summit-extract-"));
    writeFileSync(join(dir, "index.html"), "<!doctype html><html><head><title>x</title></head><body></body></html>");
    writeFileSync(join(dir, "style.css"), `.btn { background: #444444; color: #FFFFFF; } .btn-primary { background: #1D4ED8; }`);
    const { brand: b } = extractBrand(dir, "x");
    expect(b.colors.primary).toBe("#1D4ED8");
    expect(b.colors.onPrimary).toBe("#FFFFFF");
  });

  it("infers muted from other text colors that meet AA on the page", () => {
    expect(brand.colors.muted).toBe("#6A4F1B");
    expect(roles.muted?.measured).toBe(false);
  });

  it("reads font families and fallbacks", () => {
    expect(brand.fonts.display).toEqual({ family: "Fraunces", fallback: "Georgia, serif" });
    expect(brand.fonts.body).toEqual({ family: "Jost", fallback: "system-ui, sans-serif" });
    expect(brand.radius).toBe("2px");
  });
});

describe("extractEntity", () => {
  const { entity, missing } = extractEntity(site);

  it("produces a schema-valid entity", () => {
    const result = EntitySchema.safeParse(entity);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it("maps the business node from an @graph", () => {
    expect(entity).toMatchObject({
      name: "Shellfish Bar",
      type: "Restaurant",
      url: "https://shellfish.example/",
      telephone: "+1-231-555-0199",
      sameAs: ["https://www.instagram.com/shellfish.example"],
      menus: [{ name: "Menu", url: "https://shellfish.example/menu.html" }],
    });
  });

  it("normalizes days and times in opening hours", () => {
    expect(entity.locations[0]!.hours).toEqual([{ days: ["Th", "Fr", "Sa", "Su", "Mo"], opens: "16:30", closes: "21:30" }]);
    expect(entity.locations[0]!.address).toMatchObject({ street: "1 Front Street", locality: "Traverse City" });
  });

  it("collects FAQ entries from any page", () => {
    expect(entity.faq).toEqual([{ question: "Do you take reservations?", answer: "By text for parties of 2 to 5." }]);
  });

  it("reports fields the site does not publish", () => {
    expect(missing).toContain("legalName");
    expect(missing).not.toContain("telephone");
  });
});
