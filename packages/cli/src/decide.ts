// Stage 2, Decisions (SUMMIT-246): draft, validate and document site.config.json.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "node-html-parser";
import type { z } from "zod";
import { HeroConfigSchema } from "@summit/hero/config";
import {
  EntitySchema,
  SiteConfigSchema,
  type Brand,
  type Registry,
  type SiteConfig,
  type SiteConfigInput,
  type Stack,
} from "@summit/schemas";
import { htmlPages } from "./extract.js";

type Host = SiteConfig["host"]["name"];

export interface Needs {
  auth?: boolean;
  database?: boolean;
  serverActions?: boolean;
  /** Old URLs that must 301 to new ones after launch. */
  legacyRedirects?: boolean;
}

/**
 * Validates each component's config. A component without an entry here is
 * placed without config validation and reported as a warning, so adding a
 * component means adding its schema (docs/ADDING_A_COMPONENT.md).
 */
export const COMPONENT_CONFIG_SCHEMAS: Record<string, z.ZodType> = {
  hero: HeroConfigSchema,
};

const SERVER_NEEDS: Array<[keyof Needs, string]> = [
  ["auth", "accounts"],
  ["database", "a database"],
  ["serverActions", "server actions"],
];

/** The stack rule from docs/STACK_DECISION.md, as code. */
export function recommendStack(needs: Needs, existing?: Stack): { name: Stack; reason: string } {
  if (existing) {
    return { name: existing, reason: `Existing ${existing} site: keep the stack (the default for existing repos) and adopt components in place.` };
  }
  const server = SERVER_NEEDS.filter(([k]) => needs[k]).map(([, label]) => label);
  if (server.length) return { name: "next", reason: `Needs ${server.join(", ")}, which a static site cannot provide.` };
  return { name: "astro", reason: "Content site: static HTML by default, best crawlability, React only where needed." };
}

/** The hosting rule from docs/STACK_DECISION.md, as code. */
export function recommendHost(stack: Stack, needs: Needs, existing?: Host): { name: Host; reason: string } {
  const server = SERVER_NEEDS.some(([k]) => needs[k]);
  if (stack === "next" && server) {
    return { name: "vercel", reason: "Server-rendered Next needs a Node host; Vercel runs it with no adapter." };
  }
  if (existing === "github-pages" && needs.legacyRedirects) {
    return { name: "cloudflare-pages", reason: "Legacy URLs need 301 redirects, which GitHub Pages cannot serve; Cloudflare Pages reads _redirects." };
  }
  if (existing === "github-pages") {
    return {
      name: existing,
      reason:
        "Existing host kept: no legacy URLs need 301s. Trade-off: GitHub Pages cannot send security headers; moving to Cloudflare Pages is the fix if the launch gate (SUMMIT-252) requires them.",
    };
  }
  if (existing) {
    return { name: existing, reason: `Existing host kept: nothing recorded needs what ${existing} cannot do.` };
  }
  return { name: "cloudflare-pages", reason: "Default for new sites: _redirects, _headers, DNS, analytics and Turnstile in one account." };
}

export function detectStack(dir: string): Stack {
  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return "next";
    if (deps.astro) return "astro";
    if (deps.vite) return "vite";
  }
  const files = readdirSync(dir);
  return files.some((f) => f.endsWith(".jsx")) ? "nobuild-react" : "static-html";
}

export function detectHost(dir: string): Host | undefined {
  if (existsSync(join(dir, "vercel.json"))) return "vercel";
  if (existsSync(join(dir, "netlify.toml"))) return "netlify";
  if (existsSync(join(dir, "wrangler.toml"))) return "cloudflare-pages";
  if (existsSync(join(dir, "CNAME")) || existsSync(join(dir, "public", "CNAME"))) return "github-pages";
  return undefined;
}

export interface InitOptions {
  /** Directory holding site/entity.json (a client repo or an intake folder). */
  repo: string;
  client: string;
  registry: Registry;
  /** Existing site to plan around (repo root or built output). Omit for a new site. */
  existing?: string;
  needs?: Needs;
  /** Path prefixes to skip when listing existing pages. */
  ignore?: string[];
}

/** Drafts site.config.json. The draft validates; people refine it before Build. */
export function initSiteConfig(options: InitOptions): SiteConfigInput {
  const entity = EntitySchema.parse(JSON.parse(readFileSync(join(options.repo, "site/entity.json"), "utf8")));
  const needs = options.needs ?? {};
  const hero = options.registry.components.find((c) => c.name === "hero");

  if (!options.existing) {
    const stack = recommendStack(needs);
    const loc = entity.locations[0]!;
    return {
      schemaVersion: 1,
      client: options.client,
      mode: "new",
      stack,
      host: recommendHost(stack.name, needs),
      liveUrl: entity.url,
      pages: [
        {
          path: "/",
          title: entity.name,
          purpose: "Who they are, when they are open, how to get there.",
          source: "new",
          sections: hero
            ? [
                {
                  kind: "component",
                  id: "hero",
                  component: "hero",
                  version: hero.version,
                  config: {
                    eyebrow: `${loc.address.locality}, ${loc.address.region}`,
                    title: entity.name,
                    lede: entity.description,
                    primaryCta: { label: "Hours and location", href: "#visit" },
                  },
                },
              ]
            : [{ kind: "existing", id: "home", description: "Home page content (no hero component in the registry)" }],
        },
      ],
    };
  }

  const ignore = options.ignore ?? ["design-catalog/", "docs/"];
  const pages = htmlPages(options.existing)
    .filter((f) => f !== "404.html" && !ignore.some((p) => f.startsWith(p)))
    .map((file) => {
      const doc = parse(readFileSync(join(options.existing!, file), "utf8"));
      const path = file === "index.html" ? "/" : `/${file.replace(/(^|\/)index\.html$/, "$1")}`;
      const title = doc.querySelector("title")?.text.trim() || file;
      return {
        path,
        title,
        source: "existing" as const,
        sections: [{ kind: "existing" as const, id: "content", description: `Existing page content (${file})`, decision: "keep" as const }],
      };
    });
  const stack = recommendStack(needs, detectStack(options.existing));
  return {
    schemaVersion: 1,
    client: options.client,
    mode: "existing",
    stack: { ...stack, replatform: false },
    host: recommendHost(stack.name, needs, detectHost(options.existing)),
    liveUrl: entity.url,
    pages,
  };
}

export interface DecideFinding {
  severity: "error" | "warn";
  path: string;
  message: string;
}

const versionParts = (v: string) => v.split("-")[0]!.split(".").map(Number);
function compareVersions(a: string, b: string): number {
  const [x, y] = [versionParts(a), versionParts(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/**
 * Validates site.config.json against its schema, the registry and the hosting
 * rules. Errors block Build; warnings are decisions worth a second look.
 */
export function validateSiteConfig(raw: unknown, registry: Registry): { config?: SiteConfig; findings: DecideFinding[] } {
  const parsed = SiteConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      findings: parsed.error.issues.map((i) => ({ severity: "error", path: i.path.join("."), message: i.message })),
    };
  }
  const config = parsed.data;
  const findings: DecideFinding[] = [];
  const err = (path: string, message: string) => findings.push({ severity: "error", path, message });
  const warn = (path: string, message: string) => findings.push({ severity: "warn", path, message });

  config.pages.forEach((page, p) => {
    page.sections.forEach((section, s) => {
      if (section.kind !== "component") return;
      const at = `pages.${p}.sections.${s}`;
      const entry = registry.components.find((c) => c.name === section.component);
      if (!entry) return err(at, `unknown component "${section.component}"`);
      if (!entry.stacks.includes(config.stack.name)) {
        err(at, `${section.component} does not support stack "${config.stack.name}" (supports ${entry.stacks.join(", ")})`);
      }
      const cmp = compareVersions(section.version, entry.version);
      if (cmp > 0) err(`${at}.version`, `${section.component}@${section.version} is not released (registry has ${entry.version})`);
      else if (cmp < 0) warn(`${at}.version`, `${section.component}@${section.version} is older than the current ${entry.version}`);
      const schema = COMPONENT_CONFIG_SCHEMAS[section.component];
      if (!schema) return warn(`${at}.config`, `no config schema registered for ${section.component}; config not validated`);
      const result = schema.safeParse(section.config);
      if (!result.success) {
        for (const issue of result.error.issues) err(`${at}.config.${issue.path.join(".")}`, issue.message);
      }
    });
  });

  if (config.host.name === "github-pages") {
    if (config.redirects.length) err("redirects", "GitHub Pages cannot serve 301 redirects; choose cloudflare-pages or netlify");
    if (config.securityHeaders) warn("securityHeaders", "GitHub Pages cannot send response headers; security headers will not ship");
    if (config.stack.name === "next") warn("host", "Next on GitHub Pages only works as a static export; server features are unavailable");
  }
  if (config.mode === "new" && (config.stack.name === "static-html" || config.stack.name === "nobuild-react")) {
    warn("stack", `new sites default to astro; ${config.stack.name} needs a recorded reason to override the rule`);
  }
  return { config, findings };
}

const TEMPLATES: Partial<Record<Stack, string>> = { astro: "templates/astro-site", next: "templates/next-site" };

/** One entry per planned PR, in build order. Build (SUMMIT-249) works through it top to bottom. */
export function implementationDoc(config: SiteConfig): string {
  const out = [
    `# Implementation plan: ${config.client}`,
    "",
    "Generated from `decisions/site.config.json` by `summit decide docs`. One PR per entry, in this",
    "order. Every PR passes `summit verify-split` and `summit check gate` on its preview before merge.",
    "",
    `**Stack:** ${config.stack.name}${config.stack.replatform ? " (re-platform)" : ""}. **Host:** ${config.host.name}.`,
    "",
  ];
  let n = 1;
  if (config.mode === "new") {
    const template = TEMPLATES[config.stack.name];
    out.push(
      `### PR ${n++}: scaffold`,
      "",
      template
        ? `Copy \`${template}\` from summit-components, point \`@summit/*\` at release tags (\`scripts/use-tags.mjs\`), keep \`site/*.json\`.`
        : `No template for ${config.stack.name}; set up the build by hand and record why in the design doc.`,
      "",
    );
  } else {
    out.push(
      `### PR ${n++}: scaffold`,
      "",
      "Adopt in place (SUMMIT-253 Level 1): add `site/brand.json` and `site/entity.json`, wire the launch gate into CI. No visual change.",
      "",
    );
  }

  const unchanged: string[] = [];
  const later: string[] = [];
  for (const page of config.pages) {
    for (const section of page.sections) {
      if (section.kind === "component") {
        out.push(
          `### PR ${n++}: \`${page.path}\` \`${section.id}\``,
          "",
          `${section.status === "adopt" ? "Replace the existing element with" : "Add"} \`${section.component}@${section.version}\`.`,
          "",
          "```json",
          JSON.stringify(section.config, null, 2),
          "```",
          "",
        );
      } else if (section.decision === "keep") {
        unchanged.push(`- \`${section.id}\` on \`${page.path}\`: ${section.description}`);
      } else {
        later.push(`- \`${section.id}\` on \`${page.path}\`: ${section.description}`);
      }
    }
  }
  if (config.redirects.length) {
    out.push(`### PR ${n++}: redirects on ${config.host.name}`, "", "| from | to | status |", "|---|---|---|");
    for (const r of config.redirects) out.push(`| \`${r.from}\` | \`${r.to}\` | ${r.status} |`);
    out.push("");
  }
  out.push("## Unchanged existing elements", "", ...(unchanged.length ? unchanged : ["- none"]), "");
  out.push("## Replace later (not planned yet)", "", ...(later.length ? later : ["- none"]), "");
  return `${out.join("\n")}\n`;
}

/** The human-readable decisions: what was chosen, why, and what the designer still owes. */
export function designDoc(config: SiteConfig, brand?: Brand): string {
  const components = new Map<string, { version: string; pages: string[] }>();
  for (const page of config.pages) {
    for (const s of page.sections) {
      if (s.kind !== "component") continue;
      const c = components.get(s.component) ?? { version: s.version, pages: [] };
      c.pages.push(page.path);
      components.set(s.component, c);
    }
  }
  const out = [
    `# Design doc: ${config.client}`,
    "",
    "## Decisions",
    "",
    `- **Mode:** ${config.mode === "new" ? "new site" : "existing site, adopted in place"}`,
    `- **Stack:** ${config.stack.name}. ${config.stack.reason}`,
    `- **Host:** ${config.host.name}. ${config.host.reason}`,
    ...(config.liveUrl ? [`- **Live URL:** ${config.liveUrl}`] : []),
    `- **Security headers:** ${config.securityHeaders ? "yes" : "no"}`,
    `- **Redirects:** ${config.redirects.length}`,
    "",
    "## Pages",
    "",
    "| path | title | source | sections |",
    "|---|---|---|---|",
    ...config.pages.map((p) => `| \`${p.path}\` | ${p.title} | ${p.source} | ${p.sections.map((s) => s.id).join(", ")} |`),
    "",
    "## Components",
    "",
    ...(components.size
      ? ["| component | version | used on |", "|---|---|---|", ...[...components].map(([name, c]) => `| ${name} | ${c.version} | ${c.pages.join(", ")} |`)]
      : ["None yet: every element is an existing one kept as it is."]),
    "",
    "## Visual direction",
    "",
  ];
  if (brand) {
    out.push(
      `- Palette: bg ${brand.colors.bg}, fg ${brand.colors.fg}, primary ${brand.colors.primary}, accent ${brand.colors.accent}`,
      `- Type: ${brand.fonts.display.family} (display), ${brand.fonts.body.family} (body)`,
      `- Radius: ${brand.radius}`,
      "",
    );
  }
  out.push("_Designer: layout, imagery and motion direction, and the reasoning behind them._", "");
  return `${out.join("\n")}\n`;
}
