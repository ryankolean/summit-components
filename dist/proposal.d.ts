import { type Engagement, type Entity, type RateCard, type Registry, type SiteConfig } from "@summit/schemas";
import { type DecideFinding } from "./decide.js";
import { type Estimate } from "./estimate.js";
export interface ShareLinks {
    client: string;
    slug: string;
    example: boolean;
    proposal: string;
    preview?: string;
    styleGuide?: string;
}
export declare function shareLinks(rates: RateCard, engagement: Engagement): ShareLinks;
export declare function estimateDocument(estimate: Estimate, entity: Entity, engagement: Engagement, watermark?: string): string;
export declare function proposalDocument(input: {
    config: SiteConfig;
    entity: Entity;
    registry: Registry;
    estimate: Estimate;
    engagement: Engagement;
    links: ShareLinks;
    watermark?: string;
}): string;
export declare function contractDocument(markdown: string, watermark?: string): string;
export declare function findChrome(): string | undefined;
export declare function printPdf(chrome: string, html: string, pdf: string): boolean;
export interface BuildOptions {
    config: string;
    entity: string;
    engagement: string;
    rates: string;
    out: string;
    registry: Registry;
    /** Contract template override; defaults to the rate card's contractTemplate. */
    contract?: string;
    /** Render a contract with open items, watermarked as a draft. */
    draft?: boolean;
    pdf?: boolean;
}
export interface BuildResult {
    files: string[];
    findings: DecideFinding[];
    estimate: Estimate;
    links: ShareLinks;
    /** example: rendered from an example rate card, watermarked and never for signature. */
    contract: "written" | "example" | "draft" | "blocked" | "no-tier" | "no-template";
    unresolved: string[];
    decisions: Array<{
        line: number;
        text: string;
    }>;
    pdf: "written" | "no-chrome" | "failed" | "skipped";
}
export declare function buildProposal(options: BuildOptions): BuildResult;
/**
 * Collects every <client>/out/ under the intake root into one site. A Workers
 * static assets deploy replaces the whole site, so a proposal stays live only while its
 * out/ directory exists; delete it and publish again to take a link down.
 */
export declare function stageProposals(root: string, staging: string): ShareLinks[];
export interface LinkCheck {
    url: string;
    ok: boolean;
    detail: string;
}
/** Fetches every share link. The proposal must also answer with a noindex header. */
export declare function checkShareLinks(links: ShareLinks): Promise<LinkCheck[]>;
/**
 * Deploys the staged folder as an assets-only Worker named after the project.
 * Workers static assets honor the staged _headers file, as Pages did. Wrangler
 * runs from a scratch directory so its .wrangler/ working files never land in
 * the staged site (they would be uploaded) or in the intake repo.
 */
export declare function deployProposals(staging: string, project: string): void;
