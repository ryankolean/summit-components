#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { main as checks } from "@summit/checks";
import { BrandSchema } from "@summit/schemas";
import { designDoc, implementationDoc, initSiteConfig, validateSiteConfig } from "./decide.js";
import { loadRegistry } from "./registry.js";
import { runIntake } from "./intake.js";
import { executeNew, planNew } from "./new.js";
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
      Write design-doc.md and implementation-doc.md.`;

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

function run(): number {
  if (command === "check") return checks(rest);
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

process.exit(run());
