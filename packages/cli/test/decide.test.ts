import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { RegistrySchema, SiteConfigSchema, type SiteConfigInput } from "@summit/schemas";
import {
  designDoc,
  detectHost,
  detectStack,
  implementationDoc,
  initSiteConfig,
  recommendHost,
  recommendStack,
  runIntake,
  validateSiteConfig,
} from "../src/index.js";

const fixture = fileURLToPath(new URL("./fixtures/site/", import.meta.url));
const registry = RegistrySchema.parse(JSON.parse(readFileSync(new URL("../../../registry.json", import.meta.url), "utf8")));
const heroVersion = registry.components.find((c) => c.name === "hero")!.version;
const tmp = () => mkdtempSync(join(tmpdir(), "summit-decide-"));
const errors = (raw: unknown, reg = registry) => validateSiteConfig(raw, reg).findings.filter((f) => f.severity === "error");

const intake = tmp();
runIntake({ site: fixture, out: intake });

const base: SiteConfigInput = {
  schemaVersion: 1,
  client: "shellfish-bar",
  mode: "new",
  stack: { name: "astro", reason: "content site" },
  host: { name: "cloudflare-pages", reason: "redirects and headers" },
  pages: [
    {
      path: "/",
      title: "Home",
      source: "new",
      sections: [{ kind: "component", id: "hero", component: "hero", version: heroVersion, config: { title: "Shellfish Bar" } }],
    },
  ],
};

describe("recommendStack", () => {
  it("defaults content sites to Astro", () => {
    expect(recommendStack({})).toMatchObject({ name: "astro" });
  });

  it("picks Next when the site needs accounts, data or server actions", () => {
    expect(recommendStack({ auth: true })).toMatchObject({ name: "next" });
    expect(recommendStack({ database: true }).reason).toMatch(/database/);
  });

  it("keeps an existing stack", () => {
    const rec = recommendStack({}, "nobuild-react");
    expect(rec.name).toBe("nobuild-react");
    expect(rec.reason).toMatch(/keep/i);
  });
});

describe("recommendHost", () => {
  it("defaults new sites to Cloudflare Pages", () => {
    expect(recommendHost("astro", {})).toMatchObject({ name: "cloudflare-pages" });
  });

  it("puts a server-rendered Next site on a Node host", () => {
    expect(recommendHost("next", { auth: true })).toMatchObject({ name: "vercel" });
  });

  it("keeps an existing GitHub Pages host when nothing needs redirects, and names the header trade-off", () => {
    const rec = recommendHost("static-html", {}, "github-pages");
    expect(rec.name).toBe("github-pages");
    expect(rec.reason).toMatch(/cannot send security headers/);
  });

  it("moves off GitHub Pages when legacy URLs need 301s", () => {
    const rec = recommendHost("static-html", { legacyRedirects: true }, "github-pages");
    expect(rec.name).toBe("cloudflare-pages");
    expect(rec.reason).toMatch(/301/);
  });
});

describe("detectStack and detectHost", () => {
  it("reads the stack from package.json, or from no-build files", () => {
    const astro = tmp();
    writeFileSync(join(astro, "package.json"), JSON.stringify({ dependencies: { astro: "^7.0.0" } }));
    expect(detectStack(astro)).toBe("astro");
    const nobuild = tmp();
    writeFileSync(join(nobuild, "index.html"), "<html></html>");
    writeFileSync(join(nobuild, "App.jsx"), "export default 1");
    expect(detectStack(nobuild)).toBe("nobuild-react");
    expect(detectStack(fixture)).toBe("static-html");
  });

  it("recognizes GitHub Pages from a CNAME file", () => {
    const site = tmp();
    writeFileSync(join(site, "CNAME"), "example.com\n");
    expect(detectHost(site)).toBe("github-pages");
    expect(detectHost(tmp())).toBeUndefined();
  });
});

describe("initSiteConfig", () => {
  it("drafts a valid new-site config with the hero filled from entity.json", () => {
    const draft = initSiteConfig({ repo: intake, client: "shellfish-bar", registry });
    expect(errors(draft)).toEqual([]);
    const hero = SiteConfigSchema.parse(draft).pages[0]!.sections[0]!;
    expect(hero).toMatchObject({ kind: "component", component: "hero", version: heroVersion });
    expect(hero.kind === "component" && hero.config.title).toBe("Shellfish Bar");
  });

  it("drafts an existing-site config from the pages that exist, keeping them", () => {
    const draft = SiteConfigSchema.parse(initSiteConfig({ repo: intake, client: "shellfish-bar", registry, existing: fixture }));
    expect(draft.mode).toBe("existing");
    expect(draft.stack).toMatchObject({ name: "static-html", replatform: false });
    expect(draft.pages.map((p) => p.path)).toEqual(["/", "/visit.html"]);
    expect(draft.pages.every((p) => p.sections.every((s) => s.kind === "existing" && s.decision === "keep"))).toBe(true);
    expect(draft.liveUrl).toBe("https://shellfish.example/");
  });
});

describe("validateSiteConfig", () => {
  it("passes a valid config", () => {
    expect(errors(base)).toEqual([]);
  });

  it("fails loudly on an unknown component", () => {
    const bad = structuredClone(base);
    (bad.pages[0]!.sections[0] as { component: string }).component = "carousel";
    expect(errors(bad).map((f) => f.message).join()).toMatch(/unknown component "carousel"/);
  });

  it("fails when the component does not support the chosen stack", () => {
    const narrow = RegistrySchema.parse({
      ...registry,
      components: registry.components.map((c) => ({ ...c, stacks: ["next"] })),
    });
    expect(errors(base, narrow).map((f) => f.message).join()).toMatch(/does not support stack "astro"/);
  });

  it("fails on config the component's schema rejects", () => {
    const bad = structuredClone(base);
    (bad.pages[0]!.sections[0] as { config: object }).config = { lede: "no title" };
    expect(errors(bad).map((f) => f.path).join()).toMatch(/pages\.0\.sections\.0\.config\.title/);
  });

  it("fails on a version that has not been released", () => {
    const bad = structuredClone(base);
    (bad.pages[0]!.sections[0] as { version: string }).version = "9.0.0";
    expect(errors(bad).map((f) => f.message).join()).toMatch(/not released/);
  });

  it("fails on redirects hosted on GitHub Pages", () => {
    const bad = { ...base, host: { name: "github-pages", reason: "x" }, redirects: [{ from: "/old.html", to: "/" }] };
    expect(errors(bad).map((f) => f.message).join()).toMatch(/cannot serve 301/);
  });

  it("fails on schema errors before anything else", () => {
    expect(errors({ ...base, stack: { name: "wordpress", reason: "x" } }).length).toBeGreaterThan(0);
  });
});

describe("implementationDoc", () => {
  it("lists every element in build order, one PR per element", () => {
    const config = SiteConfigSchema.parse({
      ...base,
      pages: [
        base.pages[0]!,
        {
          path: "/menu",
          title: "Menu",
          source: "new",
          sections: [
            { kind: "component", id: "menu-hero", component: "hero", version: heroVersion, config: { title: "Menu", headingLevel: 1 } },
            { kind: "existing", id: "menu-list", description: "Hand-built menu", decision: "replace-later" },
          ],
        },
      ],
    });
    const doc = implementationDoc(config);
    const order = ["hero", "menu-hero", "menu-list"].map((id) => doc.indexOf(`\`${id}\``));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(doc).toContain("### PR 1: scaffold");
    expect(doc).toMatch(/### PR 2: `\/` `hero`/);
    expect(doc).toMatch(/### PR 3: `\/menu` `menu-hero`/);
    expect(doc).toMatch(/replace later/i);
  });
});

describe("designDoc", () => {
  it("records the stack and host decisions with their reasons", () => {
    const doc = designDoc(SiteConfigSchema.parse(base));
    expect(doc).toContain("**Stack:** astro. content site");
    expect(doc).toContain("**Host:** cloudflare-pages. redirects and headers");
  });
});

// Keep the fixture helpers honest: an existing site with a package.json is not static-html.
describe("fixture sanity", () => {
  it("detects a Vite site", () => {
    const vite = tmp();
    mkdirSync(join(vite, "src"));
    writeFileSync(join(vite, "package.json"), JSON.stringify({ devDependencies: { vite: "^7.0.0" } }));
    expect(detectStack(vite)).toBe("vite");
  });
});
