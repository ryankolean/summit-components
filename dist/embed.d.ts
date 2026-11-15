declare const Base: typeof HTMLElement;
/**
 * <summit-hero> for sites with no build step. Prefer pasting renderHero()
 * output inside the element: the element then leaves it alone and crawlers see
 * the content. Rendering from data-config or a JSON script child is the
 * fallback for pages that cannot be edited that way.
 */
export declare class SummitHero extends Base {
    connectedCallback(): void;
}
export declare function defineSummitHero(name?: string): void;
export {};
