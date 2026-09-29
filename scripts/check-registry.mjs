// Validates registry.json against the schema and against the packages it names.
// Runs after `pnpm build`, because it imports the built @summit/schemas.
import { existsSync, readFileSync } from "node:fs";
import { RegistrySchema } from "@summit/schemas";

const root = new URL("../", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const problems = [];

const parsed = RegistrySchema.safeParse(read("registry.json"));
if (!parsed.success) {
  for (const issue of parsed.error.issues) problems.push(`registry.json ${issue.path.join(".")}: ${issue.message}`);
} else {
  for (const entry of parsed.data.components) {
    const dir = `packages/${entry.package.replace("@summit/", "")}/`;
    if (!existsSync(new URL(`${dir}package.json`, root))) {
      problems.push(`${entry.name}: no package at ${dir}`);
      continue;
    }
    const pkg = read(`${dir}package.json`);
    if (pkg.name !== entry.package) problems.push(`${entry.name}: ${dir} is ${pkg.name}, not ${entry.package}`);
    if (pkg.version !== entry.version) {
      problems.push(`${entry.name}: registry says ${entry.version}, package.json says ${pkg.version}`);
    }
    for (const [kind, specifier] of Object.entries(entry.entrypoints)) {
      if (kind === "cli") continue;
      if (!specifier.startsWith(entry.package)) {
        problems.push(`${entry.name}: ${kind} entrypoint ${specifier} is outside ${entry.package}`);
        continue;
      }
      const subpath = `.${specifier.slice(entry.package.length)}`;
      if (!pkg.exports?.[subpath]) problems.push(`${entry.name}: ${entry.package} does not export "${subpath}"`);
    }
    if (entry.example && !existsSync(new URL(entry.example, root))) {
      problems.push(`${entry.name}: example ${entry.example} does not exist`);
    }
  }
}

if (problems.length) {
  console.error(`registry check failed:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`registry ok: ${parsed.data.components.length} component(s)`);
