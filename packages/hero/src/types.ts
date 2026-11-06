/**
 * Props shared by every rendering of the hero. Kept free of runtime imports so
 * the html and embed entrypoints stay dependency-free and load in a plain page.
 */
export interface HeroCta {
  label: string;
  href: string;
}

/** A `<source>` in the `<picture>`, e.g. AVIF or WebP ahead of the `<img>` fallback. */
export interface HeroImageSource {
  /** MIME type, e.g. "image/avif". The browser skips sources it cannot decode. */
  type: string;
  srcset: string;
  /** Defaults to the image's `sizes`. */
  sizes?: string;
}

/**
 * Optional fields use their HTML attribute names. With `sources`, the `<img>`
 * is wrapped in a `<picture>` and stays the fallback.
 */
export interface HeroImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcset?: string;
  sizes?: string;
  sources?: HeroImageSource[];
  /** "high" when the image is the page's largest contentful paint. */
  fetchpriority?: "high" | "low" | "auto";
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
  /** With an image: "split" puts text and image side by side from 768px, "stacked" keeps text over image. */
  layout?: "split" | "stacked";
}

const SAFE_HREF = /^(?:https?:|mailto:|tel:|\/|#|\.{0,2}\/|[^:]*$)/i;

export function isSafeHref(href: string): boolean {
  return SAFE_HREF.test(href.trim());
}

export function assertSafeHref(href: string): string {
  if (!isSafeHref(href)) throw new Error(`unsafe href: ${href}`);
  return href;
}
