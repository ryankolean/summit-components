import type { RunOptions, Site } from "./types.js";
export declare function normalizeBase(base?: string): string;
/** Loads a built site (or a repo root that is published as-is) from disk. */
export declare function loadSite(root: string, options?: RunOptions): Site;
export type PathResolution = {
    kind: "ok";
    file: string;
} | {
    kind: "broken";
    reason: string;
};
export type Resolution = {
    kind: "skip";
} | PathResolution;
/**
 * Resolves a reference the way the host would. A base must be followed by a
 * separator: "/4pm-detroitbar/x" is not under "/4pm-detroit/".
 */
export declare function resolveRef(site: Site, fromUrlPath: string, ref: string): Resolution;
export declare function resolvePath(site: Site, pathname: string): PathResolution;
