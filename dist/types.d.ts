/**
 * Props shared by every rendering of the hero. Kept free of runtime imports so
 * the html and embed entrypoints stay dependency-free and load in a plain page.
 */
export interface HeroCta {
    label: string;
    href: string;
}
export interface HeroImage {
    src: string;
    alt: string;
    width: number;
    height: number;
}
export interface HeroProps {
    /** Prefix for element ids; must be unique on the page. */
    id?: string;
    headingLevel?: 1 | 2;
    eyebrow?: string;
    title: string;
    lede?: string;
    primaryCta?: HeroCta;
    secondaryCta?: HeroCta;
    image?: HeroImage;
    align?: "start" | "center";
}
export declare function isSafeHref(href: string): boolean;
export declare function assertSafeHref(href: string): string;
