import { type Registry } from "@summit/schemas";
/**
 * The component registry this CLI was released with. The published bundle
 * carries a copy beside it; in the workspace it is the repo's registry.json.
 */
export declare function loadRegistry(path?: string): Registry;
