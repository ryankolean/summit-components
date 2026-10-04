import { type RoleSource } from "./extract.js";
/**
 * First line of every private intake document. `summit verify-split` fails any
 * site repo that contains it, so a private doc cannot be committed by accident.
 */
export declare const PRIVATE_MARKER = "<!-- summit:private intake. Never commit this file to a site repo. -->";
export interface IntakeOptions {
    /** Site to read: a repo root published as-is, or a built output directory. */
    site: string;
    /** Client intake directory, inside the private Summit intake repo. */
    out: string;
    name?: string;
}
export interface IntakeResult {
    entityValid: boolean;
    brandValid: boolean;
    errors: string[];
    missing: string[];
    roles: Record<string, RoleSource>;
}
/**
 * Existing-repo intake: measure what a site already publishes. Public facts go
 * to <out>/site/ (copied into the site repo later); everything else is a
 * private document at <out>/ with PRIVATE_MARKER on its first line.
 */
export declare function runIntake(options: IntakeOptions): IntakeResult;
