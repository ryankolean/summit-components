import type { Brand } from "@summit/schemas";
export declare const PREFIX = "--summit";
/** WCAG 2.x contrast ratio between two hex colors, 1 to 21. */
export declare function contrastRatio(a: string, b: string): number;
export interface ContrastIssue {
    pair: string;
    ratio: number;
    min: number;
    level: "error" | "warn";
    note: string;
}
/**
 * Checks the pairs components actually render. Every text role must meet WCAG
 * AA (4.5:1), including primary, which outline buttons and links use as text.
 * The accent only warns, because many brands use it as a ground and never as text.
 */
export declare function checkContrast(brand: Brand): ContrastIssue[];
/** Brand tokens as CSS custom properties, the contract every component styles against. */
export declare function toCssVariables(brand: Brand, options?: {
    selector?: string;
}): string;
/** Tailwind preset that points utilities at the CSS variables, so one stylesheet rebrands both. */
export declare function tailwindPreset(brand: Brand): {
    theme: {
        extend: {
            colors: Record<string, string>;
            fontFamily: {
                display: string[];
                body: string[];
            };
            borderRadius: {
                brand: string;
            };
        };
    };
};
