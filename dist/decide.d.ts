import type { z } from "zod";
import { type Brand, type Registry, type SiteConfig, type SiteConfigInput, type Stack } from "@summit/schemas";
type Host = SiteConfig["host"]["name"];
export interface Needs {
    auth?: boolean;
    database?: boolean;
    serverActions?: boolean;
    /** Old URLs that must 301 to new ones after launch. */
    legacyRedirects?: boolean;
}
/**
 * Validates each component's config. A component without an entry here is
 * placed without config validation and reported as a warning, so adding a
 * component means adding its schema (docs/ADDING_A_COMPONENT.md).
 */
export declare const COMPONENT_CONFIG_SCHEMAS: Record<string, z.ZodType>;
/** The stack rule from docs/STACK_DECISION.md, as code. */
export declare function recommendStack(needs: Needs, existing?: Stack): {
    name: Stack;
    reason: string;
};
/** The hosting rule from docs/STACK_DECISION.md, as code. */
export declare function recommendHost(stack: Stack, needs: Needs, existing?: Host): {
    name: Host;
    reason: string;
};
export declare function detectStack(dir: string): Stack;
export declare function detectHost(dir: string): Host | undefined;
export interface InitOptions {
    /** Directory holding site/entity.json (a client repo or an intake folder). */
    repo: string;
    client: string;
    registry: Registry;
    /** Existing site to plan around (repo root or built output). Omit for a new site. */
    existing?: string;
    needs?: Needs;
    /** Path prefixes to skip when listing existing pages. */
    ignore?: string[];
}
/** Drafts site.config.json. The draft validates; people refine it before Build. */
export declare function initSiteConfig(options: InitOptions): SiteConfigInput;
export interface DecideFinding {
    severity: "error" | "warn";
    path: string;
    message: string;
}
/**
 * Validates site.config.json against its schema, the registry and the hosting
 * rules. Errors block Build; warnings are decisions worth a second look.
 */
export declare function validateSiteConfig(raw: unknown, registry: Registry): {
    config?: SiteConfig;
    findings: DecideFinding[];
};
/** One entry per planned PR, in build order. Build (SUMMIT-249) works through it top to bottom. */
export declare function implementationDoc(config: SiteConfig): string;
/** The human-readable decisions: what was chosen, why, and what the designer still owes. */
export declare function designDoc(config: SiteConfig, brand?: Brand): string;
export {};
