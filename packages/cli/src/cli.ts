#!/usr/bin/env node
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { main as checks } from "@summit/checks";
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
      Run @summit/checks (see summit check --help).`;

const [command, ...rest] = process.argv.slice(2);

function run(): number {
  if (command === "check") return checks(rest);
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
