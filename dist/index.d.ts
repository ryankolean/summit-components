import type { Entity } from "@summit/schemas";
type Location = Entity["locations"][number];
type Hours = Location["hours"][number];
/**
 * The business as JSON-LD, generated from entity.json so the structured data
 * can never disagree with the page. The first location is the primary one;
 * any others are listed as departments.
 */
export declare function entityJsonLd(entity: Entity): Record<string, unknown>;
/** FAQPage JSON-LD from the same FAQ entries the page renders, or null when there are none. */
export declare function faqJsonLd(entity: Entity): Record<string, unknown> | null;
/** JSON for a <script type="application/ld+json"> body; "<" is escaped so the data cannot close the tag. */
export declare function serializeJsonLd(data: unknown): string;
export declare function formatHours(hours: Hours[]): string;
export interface LlmsPage {
    title: string;
    url: string;
    description?: string;
}
/**
 * llms.txt for answer engines: the facts people ask about, the pages, and the
 * FAQ, all from entity.json so it stays in step with the site.
 */
export declare function llmsTxt(entity: Entity, options?: {
    pages?: LlmsPage[];
}): string;
/** Crawlers used for AI training rather than search; blocking them does not affect search ranking. */
export declare const AI_TRAINING_CRAWLERS: string[];
export interface RobotsOptions {
    mode: "production" | "preview";
    sitemapUrl: string;
    /** Explicit per-client policy (SUMMIT-252). Defaults to allow. */
    aiCrawlers?: "allow" | "block";
}
export declare function robotsTxt({ mode, sitemapUrl, aiCrawlers }: RobotsOptions): string;
export {};
