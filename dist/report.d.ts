import type { Report } from "./types.js";
/** Scorecard for a terminal or a PR comment. Shows the first few findings per check. */
export declare function formatReport(report: Report, { limit }?: {
    limit?: number | undefined;
}): string;
