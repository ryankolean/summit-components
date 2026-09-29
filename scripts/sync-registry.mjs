// Copies each package's version into registry.json after `changeset version`,
// so a release never leaves the registry pointing at an old version.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const registryUrl = new URL("registry.json", root);
const registry = JSON.parse(readFileSync(registryUrl, "utf8"));

for (const entry of registry.components) {
  const dir = entry.package.replace("@summit/", "");
  const pkg = JSON.parse(readFileSync(new URL(`packages/${dir}/package.json`, root), "utf8"));
  if (entry.version !== pkg.version) {
    console.log(`${entry.name}: ${entry.version} -> ${pkg.version}`);
    entry.version = pkg.version;
  }
}

writeFileSync(registryUrl, `${JSON.stringify(registry, null, 2)}\n`);
