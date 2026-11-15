import type { Brand, Entity } from "@summit/schemas";
/**
 * A stack-neutral preview built from site/*.json alone, so a new client repo
 * deploys something real before Decisions picks a stack. Always noindex.
 */
export declare function renderPreview(repo: string, out: string): void;
/**
 * The public style guide, built from brand.json alone so it is safe to share:
 * palette roles with contrast, type and radius. Private brand notes (voice,
 * licences) stay in the intake repo's style-guide.md.
 */
export declare function styleGuideHtml(brand: Brand, entity: Entity): string;
