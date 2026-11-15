import { type Brand, type BrandHub, type Entity } from "@summit/schemas";
export interface HubLogo {
    name: string;
    filename: string;
    dataUri: string;
    on: string;
    usage?: string;
}
export interface BrandHubOptions {
    /** Client intake folder: holds site/brand.json and brand-hub.json. */
    intake: string;
    /** Output directory. Defaults to <intake>/out/brand-hub (git-ignored). */
    out?: string;
    now?: Date;
}
export interface BrandHubResult {
    file: string;
    draft: boolean;
    warnings: string[];
}
export declare function colorFormats(hex: string): {
    hex: string;
    rgb: string;
    hsl: string;
};
/** Every ordered pair of distinct palette colors that passes AA for body text, best first. */
export declare function passingPairs(brand: Brand): {
    fg: string;
    bg: string;
    ratio: number;
}[];
/** Design Tokens Community Group format, which Figma plugins such as Tokens Studio import. */
export declare function designTokens(brand: Brand): {
    color: {
        [k: string]: {
            $type: string;
            $value: string;
        };
    };
    font: {
        display: {
            $type: string;
            $value: string[];
        };
        body: {
            $type: string;
            $value: string[];
        };
    };
    radius: {
        base: {
            $type: string;
            $value: string;
        };
    };
};
export declare function tokenFiles(brand: Brand): Array<{
    name: string;
    mime: string;
    body: string;
    note: string;
}>;
export declare function fontStylesheets(brand: Brand, hub: BrandHub): string[];
export declare function loadLogos(intake: string, hub: BrandHub, brand: Brand, warnings: string[]): HubLogo[];
interface PageInput {
    brand: Brand;
    hub: BrandHub;
    entity?: Entity;
    logos: HubLogo[];
    draft: boolean;
    date: string;
}
export declare function brandHubHtml(input: PageInput): string;
/**
 * Builds <out>/index.html from an intake folder. Reads brand-hub.json, or
 * brand-hub.draft.json with a draft banner and pending markers when the final
 * file does not exist yet.
 */
export declare function renderBrandHub(options: BrandHubOptions): BrandHubResult;
/** Starter content written by intake, filled in from the owner's answers and renamed to brand-hub.json. */
export declare function brandHubDraft(brand: Brand | undefined, entity: Entity | undefined): {
    tagline: string;
    summary: string;
    version: string;
    logos: {
        name: string;
        file: string;
        on: string;
        usage: string;
    }[];
    logoRules: {
        clearSpace: string;
        minSize: string;
    };
    colorUsage: {
        [k: string]: string;
    };
    voice: {
        summary: string;
        traits: never[];
        examples: never[];
    };
    imagery: {
        summary: string;
        keywords: never[];
    };
    rules: {
        do: never[];
        dont: never[];
    };
};
export {};
