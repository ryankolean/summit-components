import type { BrandInput, EntityInput } from "@summit/schemas";
export interface CssRule {
    selector: string;
    decls: Record<string, string>;
}
/** Flat rules, including those nested in at-rules. Good enough for intake, not a full parser. */
export declare function parseCss(css: string): CssRule[];
export declare function resolveValue(value: string, vars: Map<string, string>, depth?: number): string;
/** HTML pages with index.html first, so the home page wins ties. */
export declare function htmlPages(root: string): string[];
export interface RoleSource {
    value: string;
    source: string;
    measured: boolean;
}
export declare function extractBrand(root: string, name: string): {
    brand: BrandInput;
    roles: Record<string, RoleSource>;
    palette: string[];
};
export declare function extractEntity(root: string): {
    entity: EntityInput;
    missing: string[];
    pages: string[];
};
