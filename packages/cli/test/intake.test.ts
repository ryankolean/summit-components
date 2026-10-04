import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadSite, runChecks } from "@summit/checks";
import { BrandSchema, EntitySchema } from "@summit/schemas";
import { PRIVATE_MARKER, planNew, renderPreview, runIntake, verifySplit } from "../src/index.js";

const fixture = fileURLToPath(new URL("./fixtures/site/", import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), "summit-cli-"));

describe("runIntake", () => {
  const out = tmp();
  const result = runIntake({ site: fixture, out });

  it("writes schema-valid public facts under site/", () => {
    expect(result.entityValid && result.brandValid).toBe(true);
    expect(EntitySchema.safeParse(JSON.parse(readFileSync(join(out, "site/entity.json"), "utf8"))).success).toBe(true);
    expect(BrandSchema.safeParse(JSON.parse(readFileSync(join(out, "site/brand.json"), "utf8"))).success).toBe(true);
  });

  it("writes private documents at the root, each marked private", () => {
    for (const doc of ["intake-report.md", "entity-profile.md", "style-guide.md"]) {
      expect(readFileSync(join(out, doc), "utf8")).toContain(PRIVATE_MARKER);
    }
  });

  it("never puts the private marker or private docs under site/", () => {
    expect(readFileSync(join(out, "site/entity.json"), "utf8")).not.toContain(PRIVATE_MARKER);
    expect(existsSync(join(out, "site/entity-profile.md"))).toBe(false);
  });

  it("labels each brand role measured or inferred in the report", () => {
    const report = readFileSync(join(out, "intake-report.md"), "utf8");
    expect(report).toContain("| primary | #2B2117 | .btn background | measured |");
    expect(report).toContain("| muted | #6A4F1B |");
    expect(report).toMatch(/\| muted \| #6A4F1B \| [^|]+ \| inferred \|/);
  });

  it("lists what the site does not publish as owner questions", () => {
    expect(readFileSync(join(out, "intake-report.md"), "utf8")).toContain("legalName");
    expect(readFileSync(join(out, "entity-profile.md"), "utf8")).toContain("Pain points");
  });

  it("writes drafts instead of final files when the site has no usable facts", () => {
    const empty = tmp();
    writeFileSync(join(empty, "index.html"), "<!doctype html><html><head><title>Stub</title></head><body></body></html>");
    const draftOut = tmp();
    const r = runIntake({ site: empty, out: draftOut, name: "Stub Co" });
    expect(r.entityValid).toBe(false);
    expect(existsSync(join(draftOut, "site/entity.draft.json"))).toBe(true);
    expect(existsSync(join(draftOut, "site/entity.json"))).toBe(false);
  });
});

describe("verifySplit", () => {
  const makeRepo = () => {
    const repo = tmp();
    const intake = tmp();
    runIntake({ site: fixture, out: intake });
    mkdirSync(join(repo, "site"));
    cpSync(join(intake, "site"), join(repo, "site"), { recursive: true });
    return { repo, intake };
  };

  it("passes a site repo holding only public facts", () => {
    expect(verifySplit(makeRepo().repo)).toEqual([]);
  });

  it("fails when a private intake document is committed", () => {
    const { repo, intake } = makeRepo();
    cpSync(join(intake, "entity-profile.md"), join(repo, "docs-notes.md"));
    expect(verifySplit(repo).map((f) => f.message).join()).toContain("private intake marker");
  });

  it("fails when entity.json carries keys outside the schema", () => {
    const { repo } = makeRepo();
    const path = join(repo, "site/entity.json");
    writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), ownerNotes: "wants to sell" }));
    expect(verifySplit(repo).map((f) => f.message).join()).toContain("ownerNotes");
  });

  it("fails when entity.json is invalid", () => {
    const { repo } = makeRepo();
    writeFileSync(join(repo, "site/entity.json"), JSON.stringify({ name: "x" }));
    expect(verifySplit(repo).length).toBeGreaterThan(0);
  });
});

describe("renderPreview", () => {
  it("renders a stack-neutral page that passes the preview gate", () => {
    const intake = tmp();
    runIntake({ site: fixture, out: intake });
    const out = tmp();
    renderPreview(intake, out);
    const html = readFileSync(join(out, "index.html"), "utf8");
    expect(html).toContain('<h1 id="hero-title" class="summit-hero__title">Shellfish Bar</h1>');
    expect(html).toContain('content="noindex, nofollow"');
    const report = runChecks(loadSite(out), { mode: "preview" });
    expect(report.errorCount, JSON.stringify(report.findings)).toBe(0);
  });
});

describe("planNew", () => {
  const intake = tmp();
  runIntake({ site: fixture, out: intake });

  it("creates a public repo by default and protects main", () => {
    const plan = planNew({ client: "shellfish-bar", intake, dest: "/tmp/x" });
    const cmds = plan.steps.map((s) => s.cmd.join(" "));
    expect(cmds[0]).toBe("gh repo create ryankolean/shellfish-bar --public --description Shellfish Bar website");
    expect(cmds.some((c) => c.includes("branches/main/protection"))).toBe(true);
    expect(cmds.some((c) => c.includes("/pages"))).toBe(true);
  });

  it("can create a private repo", () => {
    const plan = planNew({ client: "shellfish-bar", intake, dest: "/tmp/x", visibility: "private" });
    expect(plan.steps[0]!.cmd).toContain("--private");
  });

  it("seeds the repo with public facts, a PR template and CI, and nothing private", () => {
    const plan = planNew({ client: "shellfish-bar", intake, dest: "/tmp/x" });
    const files = Object.keys(plan.files).sort();
    expect(files).toEqual([
      ".github/pull_request_template.md",
      ".github/workflows/ci.yml",
      ".github/workflows/preview.yml",
      ".gitignore",
      "AGENTS.md",
      "README.md",
      "site/brand.json",
      "site/entity.json",
    ]);
    expect(Object.values(plan.files).join()).not.toContain(PRIVATE_MARKER);
    expect(plan.files[".github/workflows/ci.yml"]).toContain("summit verify-split .");
    expect(plan.files[".github/workflows/ci.yml"]).toContain("summit decide validate decisions/site.config.json");
  });

  it("refuses an intake without valid public facts", () => {
    const empty = tmp();
    writeFileSync(join(empty, "index.html"), "<html><head><title>x</title></head></html>");
    const draft = tmp();
    runIntake({ site: empty, out: draft, name: "x" });
    expect(() => planNew({ client: "x", intake: draft, dest: "/tmp/x" })).toThrow(/entity.json/);
  });

  it("rejects repo names that are not kebab-case", () => {
    expect(() => planNew({ client: "Shellfish Bar", intake, dest: "/tmp/x" })).toThrow(/kebab-case/);
  });
});
