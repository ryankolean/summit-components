import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  EngagementSchema,
  EntitySchema,
  RateCardSchema,
  type Engagement,
  type Entity,
  type RateCard,
  type Registry,
  type SiteConfig,
} from "@summit/schemas";
import { derivedContractValues, fillContract, mergeContractValues } from "./contract.js";
import { validateSiteConfig, type DecideFinding } from "./decide.js";
import { buildEstimate, formatAmount, type Estimate, type EstimateLine } from "./estimate.js";
import { escapeHtml as esc, markdownToHtml } from "./markdown.js";

export interface ShareLinks {
  client: string;
  slug: string;
  example: boolean;
  proposal: string;
  preview?: string;
  styleGuide?: string;
}

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const $ = (n: number) => `$${formatAmount(n)}`;
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export function shareLinks(rates: RateCard, engagement: Engagement): ShareLinks {
  const base = rates.proposals.baseUrl ?? `https://${rates.proposals.project}.pages.dev/`;
  const preview = engagement.links.preview;
  const styleGuide = engagement.links.styleGuide ?? (preview ? new URL("style-guide/", preview).href : undefined);
  return {
    client: engagement.client,
    slug: engagement.proposalSlug,
    example: rates.example,
    proposal: new URL(`${engagement.proposalSlug}/`, base).href,
    ...(preview ? { preview } : {}),
    ...(styleGuide ? { styleGuide } : {}),
  };
}

// ---------------------------------------------------------------------------
// HTML documents
// ---------------------------------------------------------------------------

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">`;

const BASE_CSS = `:root { --navy: #0B1D33; --slate: #1A2F4B; --muted: #4a5d78; --accent: #b8461f; --rule: #c9d4e2; --tint: #f0f6ff; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: var(--slate); font-family: 'DM Sans', system-ui, sans-serif; line-height: 1.6; }
h1, h2, h3 { font-family: 'Fraunces', Georgia, serif; color: var(--navy); line-height: 1.2; }
a { color: var(--navy); }
code { font-family: ui-monospace, Menlo, monospace; font-size: 0.9em; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--rule); text-align: left; vertical-align: top; }
th { background: var(--tint); color: var(--navy); font-weight: 600; }
.num { text-align: right; white-space: nowrap; }
.watermark { position: fixed; top: 0; left: 0; right: 0; z-index: 10; margin: 0; padding: 0.4rem 1rem; text-align: center; font-weight: 600; font-size: 0.85rem; background: #fff3cd; color: #5c4400; border-bottom: 1px solid #e0c36a; }
@page { size: letter; margin: 0.75in; }
@media print { table, .keep { break-inside: avoid; } h2, h3 { break-after: avoid; } }`;

/**
 * On screen the watermark is a fixed banner. In print it moves to the top page
 * margin, so it stamps every page without covering any of the content.
 */
function printWatermark(text: string): string {
  const css = text.replace(/["\\]/g, "\\$&");
  return `
@media screen { body { padding-top: 2.25rem; } }
@media print { .watermark { display: none; } }
@page { @top-center { content: "${css}"; font-family: 'DM Sans', system-ui, sans-serif; font-size: 9pt; font-weight: 600; color: #5c4400; } }`;
}

function shell({ title, body, css, watermark, head = "" }: { title: string; body: string; css: string; watermark?: string; head?: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>${esc(title)}</title>
${FONTS}
${head}<style>${BASE_CSS}
${css}${watermark ? printWatermark(watermark) : ""}</style>
</head>
<body>
${watermark ? `<p class="watermark">${esc(watermark)}</p>\n` : ""}${body}
</body>
</html>
`;
}

const GROUPS: Record<EstimateLine["group"], string> = {
  baseline: "Project",
  pages: "Pages",
  components: "Components",
  redirects: "Redirects",
  custom: "Additional work",
};

function investmentTable(estimate: Estimate): string {
  const rows: string[] = [];
  for (const group of Object.keys(GROUPS) as Array<EstimateLine["group"]>) {
    const lines = estimate.lines.filter((l) => l.group === group);
    if (!lines.length) continue;
    rows.push(`<tr class="group"><td colspan="3">${GROUPS[group]}</td></tr>`);
    for (const l of lines) {
      rows.push(`<tr><td>${esc(l.label)}</td><td class="num">${l.hours ? formatAmount(l.hours) : ""}</td><td class="num">${$(l.amount)}</td></tr>`);
    }
  }
  if (estimate.discount) {
    rows.push(`<tr><td>Subtotal</td><td class="num">${formatAmount(estimate.hours)}</td><td class="num">${$(estimate.subtotal)}</td></tr>`);
    rows.push(`<tr><td>${esc(estimate.discount.label)}</td><td></td><td class="num">-${$(estimate.discount.amount)}</td></tr>`);
  }
  rows.push(`<tr class="total"><td>Total</td><td class="num">${formatAmount(estimate.hours)}</td><td class="num">${$(estimate.total)}</td></tr>`);
  return `<div class="table-wrap"><table>
<thead><tr><th scope="col">Item</th><th scope="col" class="num">Hours</th><th scope="col" class="num">Amount</th></tr></thead>
<tbody>${rows.join("\n")}</tbody>
</table></div>
<p class="note">Hours are priced at ${$(estimate.hourlyRate)} per hour.</p>`;
}

function paymentTerms(estimate: Estimate): string {
  if (estimate.depositPercent === 0) return `<p>The full ${$(estimate.total)} is due at launch.</p>`;
  if (estimate.depositPercent === 100) return `<p>The full ${$(estimate.total)} is due on acceptance.</p>`;
  return `<ul>
<li>Deposit of ${estimate.depositPercent}% due on acceptance: <strong>${$(estimate.deposit)}</strong></li>
<li>Balance due at launch: <strong>${$(estimate.balance)}</strong></li>
</ul>`;
}

function maintenanceBlock(estimate: Estimate): string {
  const m = estimate.maintenance;
  if (!m) return "";
  const hours = `${formatAmount(m.includedUpdateHours)} hour${m.includedUpdateHours === 1 ? "" : "s"}`;
  return `<h2>Ongoing care</h2>
<p><strong>${esc(m.tier)}</strong>: ${$(m.monthlyFee)} per month, starting at launch. Month to month, with 30 days notice to cancel.</p>
<ul>
<li>Hosting, security and software updates, monitoring, backups and SSL</li>
<li>${hours} of content updates each month; more at ${$(m.hourlyRate)} per hour</li>
${m.inclusions.map((i) => `<li>${esc(i)}</li>`).join("\n")}
</ul>
<p>The Maintenance and Support Agreement sets out these terms in full and is sent separately.</p>`;
}

const docCss = `main { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1rem 4rem; }
h1 { font-size: clamp(1.9rem, 6vw, 2.6rem); margin: 0.25rem 0 0.75rem; }
h2 { font-size: 1.35rem; margin: 2.5rem 0 0.75rem; padding-top: 1.25rem; border-top: 1px solid var(--rule); }
.eyebrow { margin: 0; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }
.meta, .note { color: var(--muted); font-size: 0.95rem; }
.table-wrap { overflow-x: auto; }
table { font-size: 0.95rem; }
tr.group td { font-weight: 600; color: var(--navy); background: #fafcff; }
tr.total td { font-weight: 700; color: var(--navy); border-top: 2px solid var(--navy); }
.pages { padding-left: 1.2rem; }
.pages > li { margin-bottom: 0.9rem; }
.pages ul { margin: 0.3rem 0 0; padding-left: 1.1rem; color: var(--muted); }
.sign { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 2rem 2rem; margin-top: 2rem; }
.sign p { margin: 0; padding-top: 0.3rem; min-height: 2.5rem; border-top: 1px solid var(--slate); font-size: 0.85rem; color: var(--muted); }
@media print { main { padding: 0; } }`;

export function estimateDocument(estimate: Estimate, entity: Entity, engagement: Engagement, watermark?: string): string {
  const body = `<main>
<p class="eyebrow">Summit Software Solutions LLC</p>
<h1>Estimate for ${esc(entity.name)}</h1>
<p class="meta">Prepared for ${esc(engagement.clientLegalName)} on ${longDate(engagement.preparedOn)}. Valid until ${longDate(addDays(engagement.preparedOn, engagement.validDays))}.</p>
<h2>Website build</h2>
${investmentTable(estimate)}
<h3>Payment</h3>
${paymentTerms(estimate)}
${maintenanceBlock(estimate)}
</main>`;
  return shell({ title: `Estimate: ${entity.name}`, body, css: docCss, ...(watermark ? { watermark } : {}) });
}

const STACK_NAMES: Record<string, string> = {
  astro: "Astro",
  next: "Next.js",
  vite: "Vite",
  "static-html": "static HTML",
  "nobuild-react": "React with no build step",
};
const HOST_NAMES: Record<string, string> = {
  "github-pages": "GitHub Pages",
  "cloudflare-pages": "Cloudflare Pages",
  vercel: "Vercel",
  netlify: "Netlify",
  other: "its current host",
};

function sectionLabel(section: SiteConfig["pages"][number]["sections"][number], registry: Registry): string {
  if (section.kind === "component") {
    const description = registry.components.find((c) => c.name === section.component)?.description ?? section.component;
    return `${description}${section.status === "adopt" ? ", replacing the existing one" : ""}`;
  }
  return `${section.description} (${section.decision === "keep" ? "kept as it is" : "replaced later, quoted separately"})`;
}

export function proposalDocument(input: {
  config: SiteConfig;
  entity: Entity;
  registry: Registry;
  estimate: Estimate;
  engagement: Engagement;
  links: ShareLinks;
  watermark?: string;
}): string {
  const { config, entity, registry, estimate, engagement, links } = input;
  const stack = STACK_NAMES[config.stack.name] ?? config.stack.name;
  const host = HOST_NAMES[config.host.name] ?? config.host.name;
  const validUntil = longDate(addDays(engagement.preparedOn, engagement.validDays));
  const intro =
    config.mode === "new"
      ? `A new website for ${esc(entity.name)}, built with ${esc(stack)} and hosted on ${esc(host)}.`
      : config.stack.replatform
        ? `Work on the existing ${esc(entity.name)} website, moving it to ${esc(stack)} on ${esc(host)}.`
        : `Work on the existing ${esc(entity.name)} website, which stays on ${esc(stack)} and ${esc(host)}.`;
  const pages = config.pages
    .map(
      (p) => `<li><strong>${esc(p.title)}</strong> <code>${esc(p.path)}</code>${p.purpose ? `: ${esc(p.purpose)}` : ""}
<ul>${p.sections.map((s) => `<li>${esc(sectionLabel(s, registry))}</li>`).join("")}</ul></li>`,
    )
    .join("\n");
  const notIncluded = [
    ...estimate.deferred.map((d) => `${d}, quoted separately when you are ready`),
    ...engagement.exclusions,
    `Changes beyond this scope, quoted before any work starts at ${$(estimate.hourlyRate)} per hour`,
  ];
  const share = [
    links.preview ? `<li><a href="${esc(links.preview)}">Preview site</a>: the work in progress, updated on every change</li>` : "",
    links.styleGuide ? `<li><a href="${esc(links.styleGuide)}">Style guide</a>: colors, type and the brand rules the site follows</li>` : "",
  ].filter(Boolean);
  const body = `<main>
<p class="eyebrow">Proposal from Summit Software Solutions LLC</p>
<h1>${esc(entity.name)} website</h1>
<p class="meta">Prepared for ${esc(engagement.clientLegalName)} on ${longDate(engagement.preparedOn)}. Valid until ${validUntil}.</p>
<p>${intro}</p>

<h2>Why this approach</h2>
<ul>
<li><strong>Stack:</strong> ${esc(config.stack.reason)}</li>
<li><strong>Hosting:</strong> ${esc(config.host.reason)}</li>
</ul>

<h2>Scope</h2>
<ol class="pages">
${pages}
</ol>
${config.redirects.length ? `<p>${config.redirects.length} old address${config.redirects.length === 1 ? "" : "es"} will redirect to the new pages so links and search rankings carry over.</p>` : ""}
${estimate.kept.length ? `<p class="note">Kept as it is: ${estimate.kept.map(esc).join("; ")}.</p>` : ""}

<h2>Investment</h2>
${investmentTable(estimate)}
<h3>Payment</h3>
${paymentTerms(estimate)}
${maintenanceBlock(estimate)}

<h2>Not included</h2>
<ul>
${notIncluded.map((n) => `<li>${esc(n)}</li>`).join("\n")}
</ul>
${share.length ? `\n<h2>Links</h2>\n<ul>\n${share.join("\n")}\n</ul>` : ""}

<h2>Acceptance</h2>
<div class="keep">
<p>Signing below, or replying to the email this proposal came with to say you accept it, approves the scope and total above and the deposit invoice. This proposal is valid until ${validUntil}.</p>
<div class="sign">
<p>Name</p><p>Title</p><p>Signature</p><p>Date</p>
</div>
<p class="note">For ${esc(engagement.clientLegalName)}</p>
</div>
</main>`;
  return shell({ title: `Proposal: ${entity.name}`, body, css: docCss, ...(input.watermark ? { watermark: input.watermark } : {}) });
}

const CONTRACT_CSS = `body { font-size: 10.5pt; line-height: 1.55; max-width: 7in; margin: 0 auto; padding: 0.75in 0.5in; }
h1 { font-size: 20pt; margin: 0 0 0.6em; }
h2 { font-size: 13pt; margin: 1.6em 0 0.5em; }
h3 { font-size: 11.5pt; margin: 1.3em 0 0.4em; }
hr { border: 0; border-top: 1px solid var(--rule); margin: 1.6em 0; }
hr + h1 { break-before: page; margin-top: 0; }
p { margin: 0 0 0.7em; orphans: 3; widows: 3; }
li { margin-bottom: 0.35em; }
blockquote { margin: 0 0 1em; padding: 0.6em 0.9em; border-left: 3px solid var(--rule); background: #f6f9fd; }
table { font-size: 9.5pt; margin: 0 0 1em; }
th, td { border: 1px solid var(--rule); }
@media print { body { padding: 0; } }`;

export function contractDocument(markdown: string, watermark?: string): string {
  const title = markdown.match(/^#\s+(.*)$/m)?.[1]?.trim() ?? "Agreement";
  return shell({ title, body: markdownToHtml(markdown), css: CONTRACT_CSS, ...(watermark ? { watermark } : {}) });
}

// ---------------------------------------------------------------------------
// PDF: the browser already on this machine prints it, so no Chromium download.
// ---------------------------------------------------------------------------

export function findChrome(): string | undefined {
  const candidates = [
    process.env.SUMMIT_CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((c): c is string => Boolean(c && existsSync(c)));
}

export function printPdf(chrome: string, html: string, pdf: string): boolean {
  rmSync(pdf, { force: true });
  try {
    execFileSync(
      chrome,
      ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=10000", `--print-to-pdf=${pdf}`, pathToFileURL(html).href],
      { stdio: "pipe", timeout: 120_000 },
    );
  } catch {
    return false;
  }
  return existsSync(pdf);
}

// ---------------------------------------------------------------------------
// summit proposal build
// ---------------------------------------------------------------------------

export interface BuildOptions {
  config: string;
  entity: string;
  engagement: string;
  rates: string;
  out: string;
  registry: Registry;
  /** Contract template override; defaults to the rate card's contractTemplate. */
  contract?: string;
  /** Render a contract with open items, watermarked as a draft. */
  draft?: boolean;
  pdf?: boolean;
}

export interface BuildResult {
  files: string[];
  findings: DecideFinding[];
  estimate: Estimate;
  links: ShareLinks;
  /** example: rendered from an example rate card, watermarked and never for signature. */
  contract: "written" | "example" | "draft" | "blocked" | "no-tier" | "no-template";
  unresolved: string[];
  decisions: Array<{ line: number; text: string }>;
  pdf: "written" | "no-chrome" | "failed" | "skipped";
}

const EXAMPLE_MARK = "Example rates, not a quote. Generated from an example rate card.";

export function buildProposal(options: BuildOptions): BuildResult {
  const { config, findings } = validateSiteConfig(readJson(options.config), options.registry);
  if (!config || findings.some((f) => f.severity === "error")) {
    const errors = findings.filter((f) => f.severity === "error").map((f) => `${f.path || "(root)"}: ${f.message}`);
    throw new Error(`site.config.json is invalid:\n  ${errors.join("\n  ")}`);
  }
  const entity = EntitySchema.parse(readJson(options.entity));
  const rates = RateCardSchema.parse(readJson(options.rates));
  const engagement = EngagementSchema.parse(readJson(options.engagement));
  if (engagement.client !== config.client) throw new Error(`engagement.json is for "${engagement.client}" but site.config.json is for "${config.client}"`);

  const estimate = buildEstimate(config, options.registry, rates, engagement);
  const links = shareLinks(rates, engagement);
  const mark = rates.example ? EXAMPLE_MARK : undefined;
  const out = options.out;
  mkdirSync(join(out, "proposal"), { recursive: true });
  // Belt and braces: the output holds pricing and contacts, so it ignores itself.
  writeFileSync(join(out, ".gitignore"), "*\n");

  const files: string[] = [];
  const write = (name: string, body: string) => {
    writeFileSync(join(out, name), body);
    files.push(join(out, name));
  };
  write("estimate.json", `${JSON.stringify(estimate, null, 2)}\n`);
  write("estimate.html", estimateDocument(estimate, entity, engagement, mark));
  write("proposal/index.html", proposalDocument({ config, entity, registry: options.registry, estimate, engagement, links, ...(mark ? { watermark: mark } : {}) }));
  write("share.json", `${JSON.stringify(links, null, 2)}\n`);

  let contract: BuildResult["contract"] = "no-tier";
  let unresolved: string[] = [];
  let decisions: BuildResult["decisions"] = [];
  for (const stale of ["contract.md", "contract.html", "contract.pdf"]) rmSync(join(out, stale), { force: true });
  if (engagement.tier) {
    const templatePath = options.contract ?? (rates.contractTemplate ? resolve(dirname(options.rates), rates.contractTemplate) : undefined);
    if (!templatePath || !existsSync(templatePath)) contract = "no-template";
    else {
      const values = mergeContractValues(rates, engagement, derivedContractValues(estimate, rates, engagement, entity, config.liveUrl));
      const filled = fillContract(readFileSync(templatePath, "utf8"), values);
      unresolved = filled.unresolved;
      decisions = filled.decisions;
      const open = unresolved.length + decisions.length > 0;
      if (open && !options.draft) contract = "blocked";
      else {
        contract = open ? "draft" : rates.example ? "example" : "written";
        const watermark = open ? `Draft, not for signature: ${unresolved.length} unfilled value(s), ${decisions.length} open decision(s).` : mark;
        write("contract.md", filled.markdown);
        write("contract.html", contractDocument(filled.markdown, watermark));
      }
    }
  }

  let pdf: BuildResult["pdf"] = "skipped";
  if (options.pdf !== false) {
    const chrome = findChrome();
    if (!chrome) pdf = "no-chrome";
    else {
      const targets = ["estimate", ...(existsSync(join(out, "contract.html")) ? ["contract"] : [])];
      const ok = targets.every((name) => printPdf(chrome, resolve(out, `${name}.html`), resolve(out, `${name}.pdf`)));
      pdf = ok ? "written" : "failed";
      if (ok) files.push(...targets.map((name) => join(out, `${name}.pdf`)));
    }
  }
  return { files, findings, estimate, links, contract, unresolved, decisions, pdf };
}

// ---------------------------------------------------------------------------
// summit proposal publish
// ---------------------------------------------------------------------------

const HEADERS = `/*
  X-Robots-Tag: noindex, nofollow
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Cache-Control: no-store
`;

/**
 * Collects every <client>/out/ under the intake root into one site. A Pages
 * deploy replaces the whole site, so a proposal stays live only while its
 * out/ directory exists; delete it and publish again to take a link down.
 */
export function stageProposals(root: string, staging: string): ShareLinks[] {
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  const staged: ShareLinks[] = [];
  for (const client of readdirSync(root, { withFileTypes: true })) {
    if (!client.isDirectory() || client.name.startsWith(".") || client.name.startsWith("_")) continue;
    const out = join(root, client.name, "out");
    if (!existsSync(join(out, "share.json")) || !existsSync(join(out, "proposal/index.html"))) continue;
    const links = readJson(join(out, "share.json")) as ShareLinks;
    if (!/^[a-z0-9]{16,64}$/.test(links.slug)) throw new Error(`${out}/share.json has an invalid slug`);
    if (staged.some((s) => s.slug === links.slug)) throw new Error(`slug ${links.slug} is used by two clients`);
    mkdirSync(join(staging, links.slug), { recursive: true });
    writeFileSync(join(staging, links.slug, "index.html"), readFileSync(join(out, "proposal/index.html")));
    staged.push(links);
  }
  writeFileSync(join(staging, "_headers"), HEADERS);
  writeFileSync(join(staging, "robots.txt"), "User-agent: *\nDisallow: /\n");
  writeFileSync(
    join(staging, "index.html"),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Summit Software Solutions</title></head><body></body></html>\n',
  );
  return staged;
}

export interface LinkCheck {
  url: string;
  ok: boolean;
  detail: string;
}

/** Fetches every share link. The proposal must also answer with a noindex header. */
export async function checkShareLinks(links: ShareLinks): Promise<LinkCheck[]> {
  const urls = [links.proposal, links.preview, links.styleGuide].filter((u): u is string => Boolean(u));
  return Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { redirect: "follow" });
        const robots = res.headers.get("x-robots-tag") ?? "";
        if (!res.ok) return { url, ok: false, detail: `HTTP ${res.status}` };
        if (url === links.proposal && !robots.includes("noindex")) return { url, ok: false, detail: "no X-Robots-Tag: noindex header" };
        return { url, ok: true, detail: `HTTP ${res.status}` };
      } catch (error) {
        return { url, ok: false, detail: (error as Error).message };
      }
    }),
  );
}

export function deployProposals(staging: string, project: string): void {
  execFileSync("npx", ["--yes", "wrangler@4", "pages", "deploy", staging, "--project-name", project, "--branch", "main", "--commit-dirty=true"], {
    stdio: "inherit",
  });
}
