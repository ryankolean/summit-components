// Releases each workspace package whose current version has no tag yet.
//
// A package is packed (pnpm pack turns workspace: ranges into versions), its
// @summit/* dependencies are pointed at their own release tags, and the packed
// files are committed as a standalone root commit tagged "<name>-v<version>".
// Sites install with "github:ryankolean/summit-components#hero-v0.1.0": the
// package sits at the root of that commit, built, so npm and pnpm install it
// with no build step and no subdirectory support.
//
// usage: node scripts/release.mjs [--push] [--repo <spec>]
// Runs after `pnpm build`. Without --push, tags are created locally only.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { flag, installSpec, repoSpec, root, tagFor, workspacePackages } from "./lib/tags.mjs";

const args = process.argv.slice(2);
const push = args.includes("--push");
const repo = repoSpec(flag(args, "--repo"));
const cwd = fileURLToPath(root);
const gitDir = git0(["rev-parse", "--absolute-git-dir"]);
function git0(argv) {
  return execFileSync("git", argv, { cwd, encoding: "utf8" }).trim();
}
const git = (argv, { env = {}, dir = cwd } = {}) =>
  execFileSync("git", argv, { cwd: dir, encoding: "utf8", env: { ...process.env, ...env } }).trim();

const packages = workspacePackages();
const remoteTags = push ? git(["ls-remote", "--tags", "origin"]) : "";
const exists = (tag) =>
  git(["tag", "--list", tag]) === tag || remoteTags.includes(`refs/tags/${tag}`);

let released = 0;
for (const [name, pkg] of packages) {
  const tag = tagFor(name, pkg.version);
  if (exists(tag)) {
    console.log(`${tag}: exists, skipping`);
    continue;
  }

  const work = mkdtempSync(join(tmpdir(), "summit-release-"));
  try {
    execFileSync("pnpm", ["pack", "--pack-destination", work], { cwd: fileURLToPath(pkg.dir), stdio: "pipe" });
    const tarball = readdirSync(work).find((f) => f.endsWith(".tgz"));
    execFileSync("tar", ["-xzf", join(work, tarball), "-C", work]);
    const packed = join(work, "package");

    const manifestPath = join(packed, "package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    // A released package is built output. npm "prepares" any git dependency
    // whose manifest has a build/prepare script by running `npm install` in it,
    // which pulls devDependencies from the public registry and fails. Neither
    // field means anything in a release, so drop both.
    delete manifest.scripts;
    delete manifest.devDependencies;
    for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
      for (const dep of Object.keys(manifest[field] ?? {})) {
        const target = packages.get(dep);
        if (target) manifest[field][dep] = installSpec(repo, dep, target.version);
      }
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    // Stage the packed files into a throwaway index that belongs to this repo.
    const staging = { env: { GIT_DIR: gitDir, GIT_INDEX_FILE: join(work, "index"), GIT_WORK_TREE: packed }, dir: packed };
    git(["add", "--all", "--force", "."], staging);
    const tree = git(["write-tree"], staging);
    const commit = git(["commit-tree", tree, "-m", `release: ${name} ${pkg.version}`]);
    git(["tag", tag, commit]);
    if (push) git(["push", "origin", `refs/tags/${tag}`]);
    console.log(`${tag}: released as ${commit.slice(0, 7)}${push ? " and pushed" : " (local only)"}`);
    released++;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
console.log(`${released} package(s) released`);
