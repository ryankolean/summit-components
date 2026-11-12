import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BrandHubSchema, BrandSchema } from "@summit/schemas";
import { colorFormats, passingPairs, renderBrandHub, runIntake, verifySplit } from "../src/index.js";

const fixture = fileURLToPath(new URL("./fixtures/brand-hub/", import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), "summit-hub-"));
const now = new Date("2026-01-02T12:00:00Z");
const copy = () => {
  const dir = tmp();
  cpSync(fixture, dir, { recursive: true });
  return dir;
};

describe("renderBrandHub", () => {
  const intake = copy();
  const result = renderBrandHub({ intake, now });
  const html = readFileSync(result.file, "utf8");

  it("writes one self-contained page under out/brand-hub by default", () => {
    expect(result.file).toBe(join(intake, "out/brand-hub/index.html"));
    expect(result.draft).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(html).not.toMatch(/<script src=|<img src="(?!data:)/);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
  });

  it("shows every color role in hex, rgb and hsl", () => {
    const brand = BrandSchema.parse(JSON.parse(readFileSync(join(fixture, "site/brand.json"), "utf8")));
    for (const hex of Object.values(brand.colors)) {
      const f = colorFormats(hex!);
      expect(html).toContain(`data-copy="${f.hex}"`);
      expect(html).toContain(`data-copy="${f.rgb}"`);
      expect(html).toContain(`data-copy="${f.hsl}"`);
    }
  });

  it("inlines logos and token files as downloads", () => {
    expect(html).toContain('download="primary.svg"');
    expect(html).toContain('href="data:image/svg+xml;base64,');
    for (const name of ["tokens.css", "design-tokens.json", "tailwind.preset.js", "brand.json"]) {
      expect(html).toContain(`download="${name}"`);
    }
  });

  it("renders voice, imagery and rules content", () => {
    expect(html).toContain("Plain-spoken");
    expect(html).toContain("Gone roasting. Back at 7 tomorrow.");
    expect(html).toContain("Lake textures");
    expect(html).toContain('href="#rules"');
    expect(html).toContain("fonts.googleapis.com/css2?family=Fraunces:wght@400;600");
  });

  it("escapes client content", () => {
    const dir = copy();
    const hub = JSON.parse(readFileSync(join(dir, "brand-hub.json"), "utf8"));
    hub.tagline = '<script>alert("x")</script>';
    writeFileSync(join(dir, "brand-hub.json"), JSON.stringify(hub));
    const out = readFileSync(renderBrandHub({ intake: dir, now }).file, "utf8");
    expect(out).not.toContain('<script>alert("x")</script>');
    expect(out).toContain("&lt;script&gt;");
  });
});

describe("brand hub drafts and guards", () => {
  it("falls back to the draft with a banner and pending markers, dropping empty strings", () => {
    const dir = copy();
    rmSync(join(dir, "brand-hub.json"));
    writeFileSync(join(dir, "brand-hub.draft.json"), JSON.stringify({ tagline: "", summary: "", colorUsage: { bg: "" }, logos: [] }));
    const r = renderBrandHub({ intake: dir, now });
    const out = readFileSync(r.file, "utf8");
    expect(r.draft).toBe(true);
    expect(out).toContain("Draft for review");
    expect(out).toContain("Pending: logo source files");
  });

  it("refuses logo paths outside the intake folder", () => {
    expect(BrandHubSchema.safeParse({ logos: [{ name: "x", file: "../secret.svg" }] }).success).toBe(false);
    expect(BrandHubSchema.safeParse({ logos: [{ name: "x", file: "/etc/passwd" }] }).success).toBe(false);
  });

  it("warns about missing logo files instead of failing", () => {
    const dir = copy();
    rmSync(join(dir, "assets/logos/reversed.svg"));
    expect(renderBrandHub({ intake: dir, now }).warnings.join()).toContain("reversed.svg not found");
  });

  it("lists only pairs that pass AA, best first", () => {
    const brand = BrandSchema.parse(JSON.parse(readFileSync(join(fixture, "site/brand.json"), "utf8")));
    const pairs = passingPairs(brand);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.every((p) => p.ratio >= 4.5)).toBe(true);
    expect(pairs[0]!.ratio).toBeGreaterThanOrEqual(pairs.at(-1)!.ratio);
  });
});

describe("intake and split", () => {
  it("intake writes a brand-hub draft beside the private docs", () => {
    const out = tmp();
    runIntake({ site: fileURLToPath(new URL("./fixtures/site/", import.meta.url)), out });
    expect(existsSync(join(out, "brand-hub.draft.json"))).toBe(true);
    expect(existsSync(join(out, "site/brand-hub.draft.json"))).toBe(false);
  });

  it("verify-split rejects brand hub content in a site repo", () => {
    const repo = copy();
    expect(verifySplit(repo).some((f) => f.file === "brand-hub.json")).toBe(true);
  });
});
