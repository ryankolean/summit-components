import type { Engagement, Entity, RateCard } from "@summit/schemas";
import { type Estimate } from "./estimate.js";
type Value = string | string[];
export interface FilledContract {
    markdown: string;
    /** Placeholders with no value, e.g. "{{CLIENT_ADDRESS}}". */
    unresolved: string[];
    /** Lines still marked with a warning sign: a decision or a fact to confirm. */
    decisions: Array<{
        line: number;
        text: string;
    }>;
}
/**
 * Placeholder values computed from the estimate and rate card. They cannot be
 * overridden by hand, so the contract cannot drift from the quoted numbers.
 */
export declare function derivedContractValues(estimate: Estimate, rates: RateCard, engagement: Engagement, entity: Entity, liveUrl?: string): Record<string, Value>;
/** Rate card defaults, then the engagement, then derived values. A derived key set by hand is an error. */
export declare function mergeContractValues(rates: RateCard, engagement: Engagement, derived: Record<string, Value>): Record<string, Value>;
/** Fills a SUMMIT-196 template and strips its template banner and drafting notes. */
export declare function fillContract(template: string, values: Record<string, Value>): FilledContract;
export {};
