// Points a site's @summit/* dependencies at release tags instead of workspace:
// ranges. Used when a template is copied into a client repo, or when an existing
// site adopts a component (SUMMIT-253).
//
// usage: node scripts/use-tags.mjs <site-dir> [--repo <spec>]
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { flag, installSpec, repoSpec, workspacePackages } from "./lib/tags.mjs";

const [dir, ...rest] = process.argv.slice(2);
if (!dir) {
  console.error("usage: node scripts/use-tags.mjs <site-dir> [--repo <spec>]");
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
    manifest[field][dep] = installSpec(repo, dep, pkg.version);
    console.log(`${dep} -> ${manifest[field][dep]}`);
  }
}
writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
