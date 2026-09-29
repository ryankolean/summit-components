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

const SAFE_HREF = /^(?:https?:|mailto:|tel:|\/|#|\.{0,2}\/|[^:]*$)/i;

export function isSafeHref(href: string): boolean {
  return SAFE_HREF.test(href.trim());
}

export function assertSafeHref(href: string): string {
  if (!isSafeHref(href)) throw new Error(`unsafe href: ${href}`);
  return href;
}
