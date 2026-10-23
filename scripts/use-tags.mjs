// Points a site's @summit/* dependencies at the commits of their release tags
// instead of workspace: ranges. Used when a template is copied into a client
// repo, or when an existing site adopts a component (SUMMIT-253).
//
// usage: node scripts/use-tags.mjs <site-dir> [--repo <owner/name>]
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { flag, installSpec, releasedCommit, repoSpec, tagFor, workspacePackages } from "./lib/tags.mjs";

const [dir, ...rest] = process.argv.slice(2);
if (!dir) {
  console.error("usage: node scripts/use-tags.mjs <site-dir> [--repo <owner/name>]");
  process.exit(2);
}
const repo = repoSpec(flag(rest, "--repo"));
const packages = workspacePackages();
const path = resolve(dir, "package.json");
const manifest = JSON.parse(readFileSync(path, "utf8"));

for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
  for (const dep of Object.keys(manifest[field] ?? {})) {
    const pkg = packages.get(dep);
    if (!pkg) continue;
    const tag = tagFor(dep, pkg.version);
    manifest[field][dep] = installSpec(repo, releasedCommit(repo, tag));
    console.log(`${dep} -> ${manifest[field][dep]} (${tag})`);
  }
}
writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
