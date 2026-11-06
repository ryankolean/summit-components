// Releases each workspace package whose current version has no tag yet.
//
// A package is packed (pnpm pack turns workspace: ranges into versions), its
// @summit/* dependencies are pointed at the commits of their own release tags,
// and the packed files are committed as a standalone root commit tagged
// "<name>-v<version>". Packages release in dependency order, so a dependency
// released in the same run is tagged before anything points at it.
//
// Sites install a release from its commit's tarball, over HTTPS:
// "https://codeload.github.com/ryankolean/summit-components/tar.gz/<commit>".
// The package sits at the root of that commit, built, so npm and pnpm install
// it with no build step and no subdirectory support. A github: spec fetches
// the same commit over SSH, which fails on CI runners with no key, and npm
// records no integrity hash for it.
//
// usage: node scripts/release.mjs [--push] [--repo <owner/name>]
// Runs after `pnpm build`. Without --push, tags are created locally only.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dependencyFields, flag, installSpec, releasedCommit, releaseOrder, repoSpec, root, tagFor, workspacePackages } from "./lib/tags.mjs";

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
for (const name of releaseOrder(packages)) {
  const pkg = packages.get(name);
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
    for (const field of dependencyFields) {
      for (const dep of Object.keys(manifest[field] ?? {})) {
        const target = packages.get(dep);
        if (target) manifest[field][dep] = installSpec(repo, releasedCommit(repo, tagFor(dep, target.version)));
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
