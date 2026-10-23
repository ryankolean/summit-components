import { describe, expect, it } from "vitest";
import { BrandSchema } from "@summit/schemas";
import { checkContrast, contrastRatio, tailwindPreset, toCssVariables } from "@summit/tokens";

const brand = BrandSchema.parse({
  name: "Demo",
  colors: {
    bg: "#F5F2EF",
    fg: "#1A120B",
    muted: "#5C5046",
    primary: "#471515",
    onPrimary: "#FFFFFF",
    accent: "#D3A75A",
    brandSage: "#A9B8A4",
  },
  fonts: {
    display: { family: "Instrument Serif", fallback: "Georgia, serif" },
    body: { family: "Archivo" },
  },
  radius: "4px",
});

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("reproduces the Meantime yellow-on-cream failure", () => {
    expect(contrastRatio("#FDD757", "#F5F2EF")).toBeCloseTo(1.25, 2);
  });
});

describe("checkContrast", () => {
  it("passes a brand whose text roles meet AA", () => {
    expect(checkContrast(brand).filter((i) => i.level === "error")).toEqual([]);
  });

  it("fails when body text on the background is below 4.5:1", () => {
    const bad = { ...brand, colors: { ...brand.colors, fg: "#FDD757" } };
    const errors = checkContrast(bad).filter((i) => i.level === "error");
    expect(errors.map((e) => e.pair)).toContain("fg on bg");
  });

  it("checks link text against bg when the brand sets a link role", () => {
    // Roses: an ember fill that cannot be read as text on paper, crimson links.
    const fill = { ...brand, colors: { ...brand.colors, bg: "#F0ECE6", primary: "#F97743", onPrimary: "#2D332D" } };
    const errors = (b: typeof brand) => checkContrast(b).filter((i) => i.level === "error").map((i) => i.pair);
    expect(errors(fill)).toEqual(["primary on bg"]);
    expect(errors({ ...fill, colors: { ...fill.colors, link: "#9C1B22" } })).toEqual([]);
    expect(errors({ ...fill, colors: { ...fill.colors, link: "#B3CDB4" } })).toEqual(["link on bg"]);
  });

  it("warns, not errors, when the accent cannot be used as text", () => {
    const pale = { ...brand, colors: { ...brand.colors, accent: "#FDD757" } };
    const issues = checkContrast(pale).filter((i) => i.pair === "accent on bg");
    expect(issues).toHaveLength(1);
    expect(issues[0]?.level).toBe("warn");
  });
});

describe("toCssVariables", () => {
  const css = toCssVariables(brand);

  it("emits a variable per color role, including extra keys in kebab-case", () => {
    expect(css).toContain("--summit-color-bg: #F5F2EF;");
    expect(css).toContain("--summit-color-on-primary: #FFFFFF;");
    expect(css).toContain("--summit-color-brand-sage: #A9B8A4;");
  });

  it("emits the link role only when the brand sets it", () => {
    expect(css).not.toContain("--summit-color-link");
    const linked = BrandSchema.parse({ ...brand, colors: { ...brand.colors, link: "#701318" } });
    expect(toCssVariables(linked)).toContain("--summit-color-link: #701318;");
  });

  it("quotes font families and appends the fallback", () => {
    expect(css).toContain('--summit-font-display: "Instrument Serif", Georgia, serif;');
    expect(css).toContain('--summit-font-body: "Archivo", system-ui, sans-serif;');
  });

  it("scopes to a custom selector", () => {
    expect(toCssVariables(brand, { selector: ".theme-demo" })).toMatch(/^\.theme-demo \{/);
  });
});

describe("tailwindPreset", () => {
  it("maps colors and fonts to the CSS variables", () => {
    const preset = tailwindPreset(brand);
    expect(preset.theme.extend.colors["on-primary"]).toBe("var(--summit-color-on-primary)");
    expect(preset.theme.extend.colors["brand-sage"]).toBe("var(--summit-color-brand-sage)");
    expect(preset.theme.extend.fontFamily.display).toEqual(["var(--summit-font-display)"]);
  });
});
