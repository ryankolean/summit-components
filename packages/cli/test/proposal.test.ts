import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  EngagementSchema,
  RateCardSchema,
  RegistrySchema,
  SiteConfigSchema,
  type EngagementInput,
  type SiteConfigInput,
} from "@summit/schemas";
import {
  buildEstimate,
  buildProposal,
  fillContract,
  formatAmount,
  mergeContractValues,
  renderPreview,
  runIntake,
  stageProposals,
} from "../src/index.js";

const fixtures = fileURLToPath(new URL("./fixtures/", import.meta.url));
const commercial = join(fixtures, "commercial");
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const registryRaw = readJson(fileURLToPath(new URL("../../../registry.json", import.meta.url)));
const registry = RegistrySchema.parse(registryRaw);
const heroVersion = registry.components.find((c) => c.name === "hero")!.version;
const rates = RateCardSchema.parse(readJson(join(commercial, "rate-card.example.json")));
const engagementRaw: EngagementInput = readJson(join(commercial, "engagement.json"));
const engagement = EngagementSchema.parse(engagementRaw);
const tmp = () => mkdtempSync(join(tmpdir(), "summit-proposal-"));
const EM_DASH = String.fromCharCode(0x2014);

const intake = tmp();
runIntake({ site: join(fixtures, "site"), out: intake });

const hero = (status: "new" | "adopt" = "new") => ({ kind: "component" as const, id: "hero", component: "hero", version: heroVersion, status, config: { title: "Shellfish Bar" } });
const base: SiteConfigInput = {
  schemaVersion: 1,
  client: "shellfish-bar",
  mode: "new",
  stack: { name: "astro", reason: "Content site, static by default." },
  host: { name: "cloudflare-pages", reason: "Redirects and headers in one account." },
  liveUrl: "https://shellfish.example/",
  pages: [{ path: "/", title: "Home", source: "new", sections: [hero()] }],
};
const config = (patch: Partial<SiteConfigInput> = {}) => SiteConfigSchema.parse({ ...base, ...patch });

describe("buildEstimate", () => {
  it("prices baseline work, new pages and components from the rate card", () => {
    const e = buildEstimate(config(), registry, rates, engagement);
    // 4 + 3 baseline, 3 for the page, 2 for a size-s hero, at 100 an hour.
    expect(e.lines.map((l) => [l.group, l.hours])).toEqual([
      ["baseline", 4],
      ["baseline", 3],
      ["pages", 3],
      ["components", 2],
    ]);
    expect(e.total).toBe(1200);
    expect(e.deposit).toBe(600);
    expect(e.balance).toBe(600);
    expect(e.example).toBe(true);
    expect(e.maintenance).toMatchObject({ tier: "Example Plus", monthlyFee: 100, includedUpdateHours: 2 });
  });

  it("follows site.config.json and the registry with no manual edit", () => {
    const before = buildEstimate(config(), registry, rates, engagement).total;
    const twoPages = config({ pages: [...base.pages, { path: "/menu", title: "Menu", source: "new", sections: [hero()] }] });
    expect(buildEstimate(twoPages, registry, rates, engagement).total).toBe(before + 500);

    const adopted = config({ pages: [{ path: "/", title: "Home", source: "new", sections: [hero("adopt")] }] });
    expect(buildEstimate(adopted, registry, rates, engagement).total).toBe(before - 100);

    const bigger = RegistrySchema.parse({ ...registryRaw, components: registryRaw.components.map((c: { name: string }) => (c.name === "hero" ? { ...c, effort: "l" } : c)) });
    expect(buildEstimate(config(), bigger, rates, engagement).total).toBe(before + 600);
  });

  it("keeps existing sections out of the price and lists deferred work", () => {
    const existing = config({
      mode: "existing",
      pages: [
        {
          path: "/",
          title: "Home",
          source: "existing",
          sections: [
            { kind: "existing", id: "nav", description: "Site navigation" },
            { kind: "existing", id: "menu", description: "Menu embed", decision: "replace-later" },
          ],
        },
      ],
      redirects: [{ from: "/old", to: "/" }],
    });
    const e = buildEstimate(existing, registry, rates, engagement);
    expect(e.lines.filter((l) => l.group === "pages" || l.group === "components")).toEqual([]);
    expect(e.kept).toEqual(["/: Site navigation"]);
    expect(e.deferred).toEqual(["/: Menu embed"]);
    expect(e.lines.find((l) => l.group === "redirects")?.hours).toBe(0.25);
  });

  it("adds custom line items and caps a discount at the subtotal", () => {
    const custom = EngagementSchema.parse({
      ...engagementRaw,
      lineItems: [
        { label: "Photo shoot coordination", hours: 2 },
        { label: "Stock licences", amount: 75.5 },
      ],
      discount: { label: "Launch partner", amount: 100_000 },
    });
    const e = buildEstimate(config(), registry, rates, custom);
    expect(e.subtotal).toBe(1475.5);
    expect(e.discount?.amount).toBe(1475.5);
    expect(e.total).toBe(0);
  });

  it("rejects a tier that is not on the rate card", () => {
    const wrong = EngagementSchema.parse({ ...engagementRaw, tier: "Gold" });
    expect(() => buildEstimate(config(), registry, rates, wrong)).toThrow(/not on the rate card/);
  });

  it("formats amounts for templates that supply the currency sign", () => {
    expect(formatAmount(1200)).toBe("1,200");
    expect(formatAmount(75.5)).toBe("75.50");
  });
});

describe("registry pricing fields", () => {
  it("requires an effort size on every component", () => {
    const missing = { ...registryRaw, components: registryRaw.components.map((c: object) => ({ ...c, effort: undefined })) };
    expect(RegistrySchema.safeParse(missing).success).toBe(false);
  });
});

describe("fillContract", () => {
  const template = readFileSync(join(commercial, "contract-template.md"), "utf8");

  it("strips the template banner and drafting notes, and repeats list values", () => {
    const filled = fillContract(template, {
      CLIENT_LEGAL_NAME: "Shellfish Bar LLC",
      TIER_INCLUSION_1: ["One", "Two"],
      TIER_INCLUSION_2: [],
      THIRD_PARTY_SERVICE: ["Reservations", "Newsletter"],
      THIRD_PARTY_PURPOSE: ["Bookings", "Email"],
    });
    expect(filled.markdown).not.toContain("TEMPLATE");
    expect(filled.markdown).not.toContain("Drafting note");
    expect(filled.markdown).not.toContain("Do not\npromise");
    expect(filled.markdown).toContain("- One\n- Two\n\n");
    expect(filled.markdown).toContain("| Reservations | Bookings |\n| Newsletter | Email |");
    expect(filled.unresolved).toContain("{{MONTHLY_FEE}}");
    expect(filled.unresolved).not.toContain("{{TIER_INCLUSION_2}}");
  });

  it("reports lines still marked for a decision", () => {
    const filled = fillContract("Fee: ⚠️ DECIDE\nOther line", {});
    expect(filled.decisions).toEqual([{ line: 1, text: "Fee: ⚠️ DECIDE" }]);
  });

  it("refuses a hand-set value for anything computed from the estimate", () => {
    const sneaky = EngagementSchema.parse({ ...engagementRaw, contract: { MONTHLY_FEE: "1" } });
    expect(() => mergeContractValues(rates, sneaky, { MONTHLY_FEE: "100" })).toThrow(/computed from the estimate/);
  });
});

function clientDir(engagementPatch: Partial<EngagementInput> = {}) {
  const dir = tmp();
  mkdirSync(join(dir, "decisions"), { recursive: true });
  mkdirSync(join(dir, "site"), { recursive: true });
  writeFileSync(join(dir, "decisions/site.config.json"), JSON.stringify(base));
  writeFileSync(join(dir, "site/entity.json"), readFileSync(join(intake, "site/entity.json")));
  writeFileSync(join(dir, "engagement.json"), JSON.stringify({ ...engagementRaw, ...engagementPatch }));
  return dir;
}

const build = (dir: string, extra: { draft?: boolean; rates?: string } = {}) =>
  buildProposal({
    config: join(dir, "decisions/site.config.json"),
    entity: join(dir, "site/entity.json"),
    engagement: join(dir, "engagement.json"),
    rates: extra.rates ?? join(commercial, "rate-card.example.json"),
    out: join(dir, "out"),
    registry,
    pdf: false,
    ...(extra.draft ? { draft: true } : {}),
  });

describe("buildProposal", () => {
  it("writes the estimate, proposal page and share links into a self-ignoring folder", () => {
    const dir = clientDir();
    const result = build(dir);
    expect(readFileSync(join(dir, "out/.gitignore"), "utf8")).toBe("*\n");
    expect(readJson(join(dir, "out/estimate.json")).total).toBe(1200);
    expect(result.links).toEqual({
      client: "shellfish-bar",
      slug: "k3x9q2m7v8w4p1z6",
      example: true,
      proposal: "https://summit-proposals.pages.dev/k3x9q2m7v8w4p1z6/",
      preview: "https://ryankolean.github.io/summit-sandbox-client/",
      styleGuide: "https://ryankolean.github.io/summit-sandbox-client/style-guide/",
    });

    const page = readFileSync(join(dir, "out/proposal/index.html"), "utf8");
    expect(page).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(page).toContain("Example rates, not a quote");
    expect(page).toContain("$1,200");
    expect(page).toContain("Deposit of 50% due on acceptance: <strong>$600</strong>");
    expect(page).toContain('href="https://ryankolean.github.io/summit-sandbox-client/style-guide/"');
    expect(page).toContain("Acceptance");
    expect(page).toContain("built with Astro and hosted on Cloudflare Pages");
    expect(page).toContain(registry.components[0]!.description);
    expect(page).not.toContain(EM_DASH);
  });

  it("refuses to render a contract with open items unless asked for a draft", () => {
    const { CLIENT_ADDRESS: _omit, ...rest } = engagementRaw.contract as Record<string, string | string[]>;
    const dir = clientDir({ contract: rest });
    const blocked = build(dir);
    expect(blocked.contract).toBe("blocked");
    expect(blocked.unresolved).toEqual(["{{CLIENT_ADDRESS}}"]);
    expect(existsSync(join(dir, "out/contract.html"))).toBe(false);

    const draft = build(dir, { draft: true });
    expect(draft.contract).toBe("draft");
    expect(readFileSync(join(dir, "out/contract.html"), "utf8")).toContain("Draft, not for signature: 1 unfilled value(s)");

    const withDecision = clientDir({ contract: { ...engagementRaw.contract, CLIENT_ADDRESS: "\u26A0\uFE0F confirm address" } });
    expect(build(withDecision).contract).toBe("blocked");
  });

  it("fills every computed contract value, and marks example rates as not for signature", () => {
    const dir = clientDir();
    const result = build(dir);
    expect(result.unresolved).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.contract).toBe("example");
    const md = readFileSync(join(dir, "out/contract.md"), "utf8");
    expect(md).toContain("| 1 | Shellfish Bar | shellfish.example |");
    expect(md).toContain("| Maintenance | **$100** |");
    expect(md).toContain("| Setup (non-refundable) | $1,200 |");
    expect(md).toContain("**Included Update Allowance:** 2 hours per month.");
    expect(md).toContain("- Monthly analytics summary\n- Quarterly content review\n");
    expect(readFileSync(join(dir, "out/contract.html"), "utf8")).toContain("Example rates, not a quote");
  });

  it("writes no contract for a build with no maintenance tier", () => {
    const { tier: _tier, ...noTier } = engagementRaw;
    const dir = clientDir();
    writeFileSync(join(dir, "engagement.json"), JSON.stringify(noTier));
    const result = build(dir);
    expect(result.contract).toBe("no-tier");
    expect(readFileSync(join(dir, "out/proposal/index.html"), "utf8")).not.toContain("Ongoing care");
  });

  it("escapes client-supplied text", () => {
    const dir = clientDir({ exclusions: ["<script>alert(1)</script>"] });
    build(dir);
    const page = readFileSync(join(dir, "out/proposal/index.html"), "utf8");
    expect(page).not.toContain("<script>alert(1)</script>");
    expect(page).toContain("&lt;script&gt;");
  });
});

describe("stageProposals", () => {
  it("collects every client's proposal under its slug with noindex headers", () => {
    const root = tmp();
    const dir = join(root, "shellfish-bar");
    mkdirSync(dir);
    const src = clientDir();
    for (const name of ["decisions", "site"]) mkdirSync(join(dir, name));
    writeFileSync(join(dir, "decisions/site.config.json"), readFileSync(join(src, "decisions/site.config.json")));
    writeFileSync(join(dir, "site/entity.json"), readFileSync(join(src, "site/entity.json")));
    writeFileSync(join(dir, "engagement.json"), readFileSync(join(src, "engagement.json")));
    build(dir);

    const staged = stageProposals(root, join(root, "_publish"));
    expect(staged.map((s) => s.slug)).toEqual(["k3x9q2m7v8w4p1z6"]);
    expect(existsSync(join(root, "_publish/k3x9q2m7v8w4p1z6/index.html"))).toBe(true);
    expect(readFileSync(join(root, "_publish/_headers"), "utf8")).toContain("X-Robots-Tag: noindex, nofollow");
    expect(readFileSync(join(root, "_publish/robots.txt"), "utf8")).toContain("Disallow: /");
  });
});

describe("style guide preview page", () => {
  it("renders a public style guide from brand.json beside the preview", () => {
    const out = tmp();
    renderPreview(intake, out);
    const page = readFileSync(join(out, "style-guide/index.html"), "utf8");
    expect(page).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(page).toContain("style guide");
    expect(page).toMatch(/#[0-9a-fA-F]{3,6}<\/code>/);
    expect(page).toContain('href="../"');
  });
});
