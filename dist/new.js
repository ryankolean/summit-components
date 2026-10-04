import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { EntitySchema } from "@summit/schemas";
function cliVersion() {
    const require = createRequire(import.meta.url);
    return JSON.parse(readFileSync(require.resolve("../package.json"), "utf8")).version;
}
/** Everything `summit new` will do, without doing it. Tests and --dry-run read this. */
export function planNew(options) {
    if (!/^[a-z][a-z0-9-]*$/.test(options.client))
        throw new Error(`repo name must be kebab-case: "${options.client}"`);
    const owner = options.owner ?? "ryankolean";
    const repo = `${owner}/${options.client}`;
    // Public by default (Ryan, 2026-10-04): site repos hold public facts only,
    // and branch protection and Pages are free on public repos.
    const visibility = options.visibility ?? "public";
    let entityJson;
    let brandJson;
    try {
        entityJson = readFileSync(join(options.intake, "site/entity.json"), "utf8");
        brandJson = readFileSync(join(options.intake, "site/brand.json"), "utf8");
    }
    catch {
        throw new Error(`${options.intake}/site needs a valid entity.json and brand.json; finish the intake drafts first`);
    }
    const entity = EntitySchema.parse(JSON.parse(entityJson));
    const files = seedFiles({ name: entity.name, repo, version: cliVersion() });
    files["site/entity.json"] = entityJson;
    files["site/brand.json"] = brandJson;
    const protection = JSON.stringify({
        required_status_checks: { strict: false, contexts: ["ci"] },
        enforce_admins: false,
        required_pull_request_reviews: null,
        restrictions: null,
        allow_force_pushes: false,
        allow_deletions: false,
    });
    const steps = [
        { describe: "create the repo", cmd: ["gh", "repo", "create", repo, `--${visibility}`, "--description", `${entity.name} website`] },
        { describe: "clone it", cmd: ["gh", "repo", "clone", repo, options.dest] },
        { describe: "commit the seed", cmd: ["git", "add", "-A"], cwd: options.dest },
        { describe: "commit the seed", cmd: ["git", "commit", "-m", "chore: bootstrap client repo from summit intake"], cwd: options.dest },
        { describe: "push main", cmd: ["git", "push", "-u", "origin", "HEAD:main"], cwd: options.dest },
        {
            describe: "protect main: no force pushes or deletions, ci must pass",
            cmd: ["gh", "api", "-X", "PUT", `repos/${repo}/branches/main/protection`, "--input", "-"],
            input: protection,
            optional: true,
        },
        {
            describe: "enable GitHub Pages for the preview workflow",
            cmd: ["gh", "api", "-X", "POST", `repos/${repo}/pages`, "-f", "build_type=workflow"],
            optional: true,
        },
        { describe: "run the first preview deploy", cmd: ["gh", "workflow", "run", "preview.yml", "--repo", repo], optional: true },
    ];
    return { repo, steps, files };
}
/** Runs a plan. Seed files are written after the clone step. Returns per-step results. */
export function executeNew(plan, dest, log = console.log) {
    const results = [];
    for (const step of plan.steps) {
        if (step.cmd.join(" ") === "git add -A") {
            for (const [path, body] of Object.entries(plan.files)) {
                mkdirSync(dirname(join(dest, path)), { recursive: true });
                writeFileSync(join(dest, path), body);
            }
        }
        try {
            execFileSync(step.cmd[0], step.cmd.slice(1), {
                cwd: step.cwd,
                input: step.input,
                stdio: ["pipe", "pipe", "pipe"],
                encoding: "utf8",
            });
            log(`ok    ${step.describe}`);
            results.push({ step, ok: true });
        }
        catch (error) {
            const message = String(error.stderr || error.message).trim().split("\n")[0];
            log(`${step.optional ? "skip" : "FAIL"}  ${step.describe}: ${message}`);
            results.push({ step, ok: false, error: message });
            if (!step.optional)
                break;
        }
    }
    return results;
}
function seedFiles({ name, repo, version }) {
    const install = `npm install --global github:ryankolean/summit-components#cli-v${version}`;
    return {
        "README.md": `# ${name}

Website for ${name}, built with the Summit framework.

The stack is chosen in the Decisions stage. Until then this repo holds the
client's public facts (\`site/entity.json\`, \`site/brand.json\`) and deploys an
intake preview from them on every push to \`main\`.

## Commands

\`\`\`bash
${install}
summit preview . --out _preview       # build the intake preview
summit verify-split .                 # prove no private intake is committed
summit check gate _preview --mode preview
\`\`\`
`,
        "AGENTS.md": `# AGENTS.md

- \`site/entity.json\` holds **public facts only**. Private intake (pain points,
  competitors, pricing, personal contacts) lives in the private Summit intake
  repo and never here. CI runs \`summit verify-split\` to enforce this.
- Branch and open a PR for every change; CI must pass before merging.
- Conventional commits, no emojis, no em dashes.
`,
        ".gitignore": "node_modules/\ndist/\n_preview/\n.DS_Store\n.env\n.env.*\n",
        ".github/pull_request_template.md": `## What changed

## Why

## Checklist

- [ ] \`summit verify-split .\` passes (no private intake committed)
- [ ] Preview checked at 375, 768 and 1280 px
- [ ] Jira card linked
`,
        ".github/workflows/ci.yml": `name: ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: ${install}
      - run: summit verify-split .
      - name: Validate decisions, once the Decisions stage has written them
        run: if [ -f decisions/site.config.json ]; then summit decide validate decisions/site.config.json; fi
      - run: summit preview . --out _preview
      - run: summit check gate _preview --mode preview
`,
        ".github/workflows/preview.yml": `name: preview

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: ${install}
      - run: summit preview . --out _preview
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _preview
      - id: deployment
        uses: actions/deploy-pages@v4
`,
    };
}
//# sourceMappingURL=new.js.map