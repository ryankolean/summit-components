import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { EntitySchema } from "@summit/schemas";
import { PRIVATE_MARKER } from "./intake.js";

export interface SplitFinding {
  file: string;
  message: string;
}

const TEXT = new Set([".md", ".json", ".html", ".txt", ".js", ".mjs", ".ts", ".tsx", ".astro", ".css", ".yml", ".yaml", ""]);
const PRIVATE_NAMES = new Set(["entity-profile.md", "intake-report.md", "owner-intake.md"]);
const ENTITY_KEYS = new Set(Object.keys(EntitySchema.shape));

/**
 * Proves a site repo holds public facts only: no file carries the private
 * intake marker or a private intake filename, and site/entity.json validates
 * with no keys outside the schema (an unknown key is where private notes hide).
 */
export function verifySplit(repo: string): SplitFinding[] {
  const findings: SplitFinding[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const full = join(dir, entry.name);
      const file = relative(repo, full).split(sep).join("/");
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      if (PRIVATE_NAMES.has(entry.name)) findings.push({ file, message: "private intake document in a site repo" });
      if (TEXT.has(extname(entry.name)) && statSync(full).size < 2_000_000 && readFileSync(full, "utf8").includes(PRIVATE_MARKER)) {
        findings.push({ file, message: "contains the private intake marker" });
      }
    }
  };
  visit(repo);

  const entityPath = join(repo, "site", "entity.json");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(entityPath, "utf8"));
  } catch (error) {
    findings.push({ file: "site/entity.json", message: `missing or unreadable: ${(error as Error).message}` });
    return findings;
  }
  for (const key of Object.keys(raw as object)) {
    if (!ENTITY_KEYS.has(key)) findings.push({ file: "site/entity.json", message: `unknown key "${key}" (public facts only)` });
  }
  const parsed = EntitySchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      findings.push({ file: "site/entity.json", message: `${issue.path.join(".")}: ${issue.message}` });
    }
  }
  return findings;
}
