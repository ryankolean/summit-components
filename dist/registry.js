import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RegistrySchema } from "@summit/schemas";
/**
 * The component registry this CLI was released with. The published bundle
 * carries a copy beside it; in the workspace it is the repo's registry.json.
 */
export function loadRegistry(path) {
    const candidates = path
        ? [path]
        : [fileURLToPath(new URL("./registry.json", import.meta.url)), fileURLToPath(new URL("../../../registry.json", import.meta.url))];
    const file = candidates.find((c) => existsSync(c));
    if (!file)
        throw new Error(`registry.json not found (looked in ${candidates.join(", ")})`);
    return RegistrySchema.parse(JSON.parse(readFileSync(file, "utf8")));
}
//# sourceMappingURL=registry.js.map