import type { Engagement, RateCard, Registry, SiteConfig } from "@summit/schemas";
export interface EstimateLine {
    group: "baseline" | "pages" | "components" | "redirects" | "custom";
    label: string;
    hours: number;
    amount: number;
}
export interface Estimate {
    client: string;
    example: boolean;
    hourlyRate: number;
    lines: EstimateLine[];
    hours: number;
    subtotal: number;
    discount?: {
        label: string;
        amount: number;
    };
    total: number;
    depositPercent: number;
    deposit: number;
    balance: number;
    maintenance?: {
        tier: string;
        monthlyFee: number;
        includedUpdateHours: number;
        inclusions: string[];
        hourlyRate: number;
    };
    /** Existing sections kept as they are: in scope, not priced. */
    kept: string[];
    /** Existing sections marked replace-later: quoted separately. */
    deferred: string[];
}
/** "1,250" or "1,250.50". Templates supply the currency sign. */
export declare function formatAmount(n: number): string;
/**
 * Prices a validated site.config.json. Every line traces to the config, the
 * registry or the engagement, so changing a component changes the estimate
 * with no manual edit.
 */
export declare function buildEstimate(config: SiteConfig, registry: Registry, rates: RateCard, engagement: Engagement): Estimate;
