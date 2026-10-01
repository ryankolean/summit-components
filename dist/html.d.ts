import { type HeroProps } from "./types.js";
export type { HeroCta, HeroImage, HeroProps } from "./types.js";
/**
 * The hero as an HTML string. Static-HTML and no-build sites paste this output
 * directly, so the content is in the page for crawlers with no JavaScript.
 */
export declare function renderHero(props: HeroProps): string;
