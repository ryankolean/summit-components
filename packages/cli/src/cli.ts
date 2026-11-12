#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { main as checks } from "@summit/checks";
import { BrandSchema } from "@summit/schemas";
import { designDoc, implementationDoc, initSiteConfig, validateSiteConfig } from "./decide.js";
import { loadRegistry } from "./registry.js";
import { runIntake } from "./intake.js";
import { formatAmount } from "./estimate.js";
import { executeNew, planNew } from "./new.js";
import { buildProposal, checkShareLinks, deployProposals, stageProposals } from "./proposal.js";
import { renderPreview } from "./preview.js";
import { verifySplit } from "./split.js";

const USAGE = `usage: summit <command> [options]

  intake <site-dir> --out <dir> [--name <name>]
      Measure an existing site. Public facts go to <out>/site/, private
      documents to <out>/. Point --out into the private intake repo.
  new <repo-name> --intake <dir> [--private] [--dest <dir>] [--dry-run]
      Create a client repo (public by default) seeded from an intake.
  preview <repo-dir> --out <dir>
      Build the stack-neutral intake preview from site/*.json.
  verify-split <repo-dir>
      Fail if a site repo holds private intake or non-public entity keys.
  check <audit|gate> <dir> [...]
      Run @summit/checks (see summit check --help).
  decide init <repo> --client <name> [--existing <site-dir>] [--needs auth,database,serverActions,legacyRedirects] [--out <file>]
      Draft site.config.json from site/entity.json (and an existing site's pages).
  decide validate <site.config.json> [--registry <file>]
      Validate against the schema, the registry and the hosting rules.
  decide docs <site.config.json> --out <dir> [--brand <brand.json>]
      Write design-doc.md and implementation-doc.md.
  proposal build <client-dir> --rates <rate-card.json> [--config <file>] [--entity <file>]
                 [--engagement <file>] [--contract <template.md>] [--out <dir>] [--draft] [--no-pdf]
      Estimate, contract and proposal page from site.config.json. Inputs default to
      <client-dir>/decisions/site.config.json, site/entity.json and engagement.json;
      output to <client-dir>/out/, which ignores itself in git.
  proposal publish <intake-root> [--project <name>] [--dry-run]
      Deploy every <client>/out/proposal to Cloudflare Pages at its unlisted slug,
      then check each share link.`;

const [command, ...rest] = process.argv.slice(2);

function decide(argv: string[]): number {
  const [sub, target, ...more] = argv;
  const { values } = parseArgs({
    args: more,
    options: {
      client: { type: "string" },
      existing: { type: "string" },
      needs: { type: "string" },
      out: { type: "string" },
      registry: { type: "string" },
      brand: { type: "string" },
    },
  });
  if (!target) return -1;
  const registry = loadRegistry(values.registry);

  if (sub === "init") {
    if (!values.client) return -1;
    const needs = Object.fromEntries((values.needs ?? "").split(",").filter(Boolean).map((n) => [n.trim(), true]));
    const draft = initSiteConfig({ repo: target, client: values.client, registry, needs, ...(values.existing ? { existing: values.existing } : {}) });
    const json = `${JSON.stringify(draft, null, 2)}\n`;
    if (values.out) {
      mkdirSync(dirname(values.out), { recursive: true });
      writeFileSync(values.out, json);
      console.log(`wrote ${values.out}`);
    } else process.stdout.write(json);
    return 0;
  }

  const raw = JSON.parse(readFileSync(target, "utf8"));
  const { config, findings } = validateSiteConfig(raw, registry);
  for (const f of findings) console.error(`${f.severity}: ${f.path || "(root)"}: ${f.message}`);
  const failed = findings.some((f) => f.severity === "error");

  if (sub === "validate") {
    console.log(failed ? "site.config.json is invalid" : `site.config.json ok (${findings.length} warning(s))`);
    return failed ? 1 : 0;
  }
  if (sub === "docs") {
    if (!values.out) return -1;
    if (failed || !config) {
      console.error("fix the errors above before generating docs");
      return 1;
    }
    const brand = values.brand ? BrandSchema.parse(JSON.parse(readFileSync(values.brand, "utf8"))) : undefined;
    mkdirSync(values.out, { recursive: true });
    writeFileSync(join(values.out, "design-doc.md"), designDoc(config, brand));
    writeFileSync(join(values.out, "implementation-doc.md"), implementationDoc(config));
    console.log(`wrote ${values.out}/design-doc.md and ${values.out}/implementation-doc.md`);
    return 0;
  }
  return -1;
}

async function proposal(argv: string[]): Promise<number> {
  const [sub, target, ...more] = argv;
  const { values } = parseArgs({
    args: more,
    options: {
      rates: { type: "string" },
      config: { type: "string" },
      entity: { type: "string" },
      engagement: { type: "string" },
      contract: { type: "string" },
      out: { type: "string" },
      registry: { type: "string" },
      project: { type: "string" },
      draft: { type: "boolean" },
      "no-pdf": { type: "boolean" },
      "dry-run": { type: "boolean" },
    },
  });
  if (!target) return -1;

  if (sub === "build") {
    if (!values.rates) return -1;
    const result = buildProposal({
      config: values.config ?? join(target, "decisions/site.config.json"),
      entity: values.entity ?? join(target, "site/entity.json"),
      engagement: values.engagement ?? join(target, "engagement.json"),
      rates: values.rates,
      out: values.out ?? join(target, "out"),
      registry: loadRegistry(values.registry),
      ...(values.contract ? { contract: values.contract } : {}),
      draft: Boolean(values.draft),
      pdf: !values["no-pdf"],
    });
    for (const f of result.findings) console.error(`${f.severity}: ${f.path || "(root)"}: ${f.message}`);
    const e = result.estimate;
    console.log(`estimate: ${formatAmount(e.hours)} hours, $${formatAmount(e.total)}${e.maintenance ? ` + $${formatAmount(e.maintenance.monthlyFee)}/month (${e.maintenance.tier})` : ""}${e.example ? " [example rates]" : ""}`);
    const contract = {
      written: "contract: ready to sign",
      example: "contract: example rates, not for signature",
      draft: `contract: DRAFT with ${result.unresolved.length} unfilled value(s) and ${result.decisions.length} open decision(s)`,
      blocked: "contract: not rendered, open items remain (see below, or pass --draft)",
      "no-tier": "contract: none, the engagement has no maintenance tier",
      "no-template": "contract: none, no template (set contractTemplate in the rate card or pass --contract)",
    }[result.contract];
    console.log(contract);
    if (result.contract === "blocked" || result.contract === "draft") {
      for (const p of result.unresolved) console.log(`  unfilled ${p}`);
      for (const d of result.decisions) console.log(`  line ${d.line}: ${d.text.slice(0, 100)}`);
    }
    console.log(`pdf: ${{ written: "written", "no-chrome": "skipped, no Chrome found (set SUMMIT_CHROME)", failed: "Chrome failed to print", skipped: "skipped" }[result.pdf]}`);
    console.log(`proposal: ${result.links.proposal} (live after summit proposal publish)`);
    for (const f of result.files) console.log(`wrote ${f}`);
    return result.contract === "blocked" || result.contract === "no-template" || result.pdf === "failed" ? 1 : 0;
  }

  if (sub === "publish") {
    const staging = join(target, "_publish");
    const staged = stageProposals(target, staging);
    for (const s of staged) console.log(`staged ${s.client}: ${s.proposal}${s.example ? " [example rates]" : ""}`);
    if (!staged.length) {
      console.error(`no <client>/out/proposal/ under ${target}; run summit proposal build first`);
      return 1;
    }
    if (values["dry-run"]) return 0;
    deployProposals(staging, values.project ?? "summit-proposals");
    let failed = 0;
    for (const s of staged) {
      for (const check of await checkShareLinks(s)) {
        console.log(`${check.ok ? "ok  " : "FAIL"} ${check.url} ${check.detail}`);
        if (!check.ok) failed++;
      }
    }
    return failed ? 1 : 0;
  }
  return -1;
}

async function run(): Promise<number> {
  if (command === "check") return checks(rest);
  if (command === "proposal") {
    const code = await proposal(rest);
    if (code >= 0) return code;
    console.log(USAGE);
    return 2;
  }
  if (command === "decide") {
    const code = decide(rest);
    if (code >= 0) return code;
    console.log(USAGE);
    return 2;
  }
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      name: { type: "string" },
      intake: { type: "string" },
      dest: { type: "string" },
      private: { type: "boolean" },
      "dry-run": { type: "boolean" },
    },
  });
  const [target] = positionals;

  switch (command) {
    case "intake": {
      if (!target || !values.out) break;
      const result = runIntake({ site: target, out: values.out, ...(values.name ? { name: values.name } : {}) });
      console.log(`entity.json ${result.entityValid ? "valid" : "draft (invalid)"}, brand.json ${result.brandValid ? "valid" : "draft (invalid)"}`);
      for (const e of result.errors) console.log(`  ${e}`);
      console.log(`not published by the site: ${result.missing.join(", ") || "none"}`);
      console.log(`wrote ${values.out}/site/ (public) and ${values.out}/*.md (private)`);
      return 0;
    }
    case "new": {
      if (!target || !values.intake) break;
      const dest = resolve(values.dest ?? target);
      const plan = planNew({ client: target, intake: values.intake, dest, visibility: values.private ? "private" : "public" });
      if (values["dry-run"]) {
        for (const s of plan.steps) console.log(`${s.optional ? "(optional) " : ""}${s.cmd.join(" ")}`);
        console.log(`files: ${Object.keys(plan.files).join(", ")}`);
        return 0;
      }
      const results = executeNew(plan, dest);
      return results.every((r) => r.ok || r.step.optional) ? 0 : 1;
    }
    case "preview": {
      if (!target || !values.out) break;
      renderPreview(target, values.out);
      console.log(`wrote ${values.out}/index.html`);
      return 0;
    }
    case "verify-split": {
      if (!target) break;
      const findings = verifySplit(target);
      for (const f of findings) console.error(`${f.file}: ${f.message}`);
      console.log(findings.length ? `${findings.length} problem(s)` : "split ok: public facts only");
      return findings.length ? 1 : 0;
    }
  }
  console.log(USAGE);
  return 2;
}

process.exit(await run());
