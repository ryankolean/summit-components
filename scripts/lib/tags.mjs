import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

export const root = new URL("../../", import.meta.url);

/** "@summit/hero" at 0.1.0 is released as the git tag "hero-v0.1.0". */
export const tagFor = (name, version) => `${name.replace("@summit/", "")}-v${version}`;

/** The manifest fields a release keeps, and so rewrites to point at other releases. */
export const dependencyFields = ["dependencies", "peerDependencies", "optionalDependencies"];

/** Where installs point, as "owner/name" on github.com. Defaults to the origin remote. */
export function repoSpec(override) {
  if (override) return override;
  const url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8" }).trim();
  const match = url.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/);
  if (!match) throw new Error(`cannot derive owner/name from origin ${url}; pass --repo`);
  return match[1];
}

/**
 * A release is installed by its commit's tarball, over HTTPS. npm fetches a
 * `github:` spec over SSH, which fails on CI runners with no key, and records
 * no integrity hash for it.
 */
export const installSpec = (repo, commit) => `https://codeload.github.com/${repo}/tar.gz/${commit}`;

/** The commit a tag names in `git ls-remote` output, peeling an annotated tag. */
export function tagCommit(lsRemote, tag) {
  const refs = new Map(lsRemote.split("\n").map((line) => line.split("\t").reverse()));
  return refs.get(`refs/tags/${tag}^{}`) ?? refs.get(`refs/tags/${tag}`);
}

/**
 * The commit of a release tag: the local tag when there is one (a release made
 * earlier in the same run), otherwise github.com over HTTPS. Release tags are
 * lightweight tags on standalone root commits, so the commit is the release.
 */
export function releasedCommit(repo, tag) {
  try {
    return execFileSync("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}^{commit}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    const out = execFileSync("git", ["ls-remote", `https://github.com/${repo}.git`, `refs/tags/${tag}`, `refs/tags/${tag}^{}`], {
      encoding: "utf8",
    });
    const commit = tagCommit(out, tag);
    if (!commit) throw new Error(`${tag} is not released on github.com/${repo}`);
    return commit;
  }
}

/** Package names, each after the @summit/* packages it depends on, so a dependency is tagged first. */
export function releaseOrder(packages) {
  const order = [];
  const visiting = new Set();
  const visit = (name) => {
    if (order.includes(name)) return;
    if (visiting.has(name)) throw new Error(`dependency cycle through ${name}`);
    visiting.add(name);
    for (const field of dependencyFields) {
      for (const dep of Object.keys(packages.get(name)[field] ?? {})) if (packages.has(dep)) visit(dep);
    }
    visiting.delete(name);
    order.push(name);
  };
  for (const name of packages.keys()) visit(name);
  return order;
}

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
