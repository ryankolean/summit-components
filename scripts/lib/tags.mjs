import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

export const root = new URL("../../", import.meta.url);

/** "@summit/hero" at 0.1.0 is released as the git tag "hero-v0.1.0". */
export const tagFor = (name, version) => `${name.replace("@summit/", "")}-v${version}`;

/** Where installs point. Defaults to the origin remote as a github: shorthand. */
export function repoSpec(override) {
  if (override) return override;
  const url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8" }).trim();
  const match = url.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/);
  if (!match) throw new Error(`cannot derive a github: spec from origin ${url}; pass --repo`);
  return `github:${match[1]}`;
}

export const installSpec = (repo, name, version) => `${repo}#${tagFor(name, version)}`;

/** Published workspace packages, keyed by name. */
export function workspacePackages() {
  const out = new Map();
  for (const dir of readdirSync(new URL("packages/", root))) {
    const pkg = JSON.parse(readFileSync(new URL(`packages/${dir}/package.json`, root), "utf8"));
    if (!pkg.private) out.set(pkg.name, { ...pkg, dir: new URL(`packages/${dir}/`, root) });
  }
  return out;
}

export function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
