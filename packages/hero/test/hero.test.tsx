import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Hero, HeroConfigSchema, type HeroProps } from "@summit/hero";
import { renderHero } from "@summit/hero/html";

const cases: Record<string, HeroProps> = {
  minimal: { title: "Breakfast all day" },
  full: {
    id: "home-hero",
    eyebrow: "Ferndale, MI",
    title: "Breakfast all day",
    lede: "Scratch cooking since 1998.",
    primaryCta: { label: "See the menu", href: "/menu" },
    secondaryCta: { label: "Directions", href: "https://maps.example/?q=1" },
    image: { src: "/img/hero.jpg", alt: "The dining room", width: 1200, height: 900 },
    align: "center",
  },
  headingLevel2: { title: "Catering", headingLevel: 2, lede: "Parties of 50+" },
  escaping: {
    title: `Tom & Jerry's "<Diner>"`,
    lede: "a < b > c & 'd'",
    primaryCta: { label: "Go", href: "/search?a=1&b=\"2\"" },
  },
  responsiveImage: {
    title: "Oysters",
    image: {
      src: "/img/room.jpg",
      srcset: "/img/room@900.jpg 900w, /img/room.jpg 1600w",
      sizes: "(max-width: 640px) 100vw, 1072px",
      alt: "The bar",
      width: 1600,
      height: 1060,
      fetchpriority: "high",
    },
  },
  pictureStacked: {
    title: "Witamy.",
    layout: "stacked",
    primaryCta: { label: "Reserve", href: "https://resy.example/roses" },
    image: {
      src: "/img/room.jpg?v=1&w=1600",
      srcset: "/img/room@900.jpg 900w, /img/room.jpg 1600w",
      sizes: "(max-width: 640px) calc(100vw - 32px), 1072px",
      sources: [
        { type: "image/avif", srcset: "/img/room@900.avif 900w, /img/room.avif 1600w" },
        { type: "image/webp", srcset: "/img/room.webp?a=1&b=2 1600w", sizes: "50vw" },
      ],
      alt: "The open counter",
      width: 1600,
      height: 1060,
      fetchpriority: "high",
    },
  },
  stackedNoImage: { title: "Hours", layout: "stacked" },
};

// React 19 emits <link rel="preload"> for images ahead of a fragment (it hoists
// them into <head> in a full-page render). That is a resource hint, not the
// component's markup, so it is stripped before comparing.
const withoutHoistedHints = (html: string) => html.replace(/^(?:<link rel="preload"[^>]*\/>)+/, "");

describe("renderHero and <Hero> produce identical markup", () => {
  for (const [name, props] of Object.entries(cases)) {
    it(name, () => {
      const react = withoutHoistedHints(renderToStaticMarkup(<Hero {...props} />));
      expect(renderHero(props)).toBe(react);
    });
  }
});

describe("renderHero", () => {
  it("renders one heading at the requested level, labelled by id", () => {
    const html = renderHero({ title: "Hi", id: "x", headingLevel: 2 });
    expect(html).toContain('aria-labelledby="x-title"');
    expect(html).toContain('<h2 id="x-title" class="summit-hero__title">Hi</h2>');
  });

  it("omits optional regions that have no content", () => {
    const html = renderHero({ title: "Hi" });
    expect(html).not.toContain("summit-hero__eyebrow");
    expect(html).not.toContain("summit-hero__actions");
    expect(html).not.toContain("<img");
  });

  it("renders a bare <img> unless the image has sources", () => {
    const image = { src: "/a.jpg", srcset: "/a.jpg 1x, /a@2x.jpg 2x", alt: "A", width: 4, height: 3 };
    const html = renderHero({ title: "Hi", image });
    expect(html).not.toContain("<picture");
    expect(html).toContain('<img class="summit-hero__media" src="/a.jpg" srcSet="/a.jpg 1x, /a@2x.jpg 2x" alt="A"');
    expect(html).not.toContain("fetchPriority");
  });

  it("wraps the <img> in a <picture>, sources first, inheriting the image's sizes", () => {
    const html = renderHero({
      title: "Hi",
      image: {
        src: "/a.jpg",
        sizes: "100vw",
        alt: "A",
        width: 4,
        height: 3,
        fetchpriority: "high",
        sources: [
          { type: "image/avif", srcset: "/a.avif 800w" },
          { type: "image/webp", srcset: "/a.webp 800w", sizes: "50vw" },
        ],
      },
    });
    expect(html).toContain(
      '<picture class="summit-hero__picture">' +
        '<source type="image/avif" srcSet="/a.avif 800w" sizes="100vw"/>' +
        '<source type="image/webp" srcSet="/a.webp 800w" sizes="50vw"/>' +
        '<img class="summit-hero__media" src="/a.jpg" sizes="100vw" alt="A" width="4" height="3" decoding="async" fetchPriority="high"/>' +
        "</picture></section>",
    );
  });

  it("adds the stacked modifier only for the stacked layout", () => {
    expect(renderHero({ title: "Hi" })).not.toContain("summit-hero--stacked");
    expect(renderHero({ title: "Hi", layout: "split" })).not.toContain("summit-hero--stacked");
    expect(renderHero({ title: "Hi", layout: "stacked" })).toContain(
      'class="summit-hero summit-hero--start summit-hero--stacked"',
    );
  });

  it("refuses script URLs", () => {
    expect(() =>
      renderHero({ title: "Hi", primaryCta: { label: "x", href: "javascript:alert(1)" } }),
    ).toThrow(/unsafe href/);
  });
});

describe("HeroConfigSchema", () => {
  it("applies defaults", () => {
    const config = HeroConfigSchema.parse({ title: "Hi" });
    expect(config).toMatchObject({ id: "hero", headingLevel: 1, align: "start", layout: "split" });
  });

  it("accepts picture sources, srcset, sizes and fetchpriority", () => {
    const image = cases.pictureStacked!.image;
    expect(HeroConfigSchema.parse({ title: "Hi", image }).image).toEqual(image);
  });

  it("rejects a source without an image MIME type, and an unknown fetchpriority", () => {
    const image = { src: "/a.jpg", alt: "A", width: 1, height: 1 };
    const badType = { ...image, sources: [{ type: "avif", srcset: "/a.avif" }] };
    const badPriority = { ...image, fetchpriority: "urgent" };
    expect(HeroConfigSchema.safeParse({ title: "Hi", image: badType }).success).toBe(false);
    expect(HeroConfigSchema.safeParse({ title: "Hi", image: badPriority }).success).toBe(false);
  });

  it("rejects an unknown layout", () => {
    expect(HeroConfigSchema.safeParse({ title: "Hi", layout: "grid" }).success).toBe(false);
  });

  it("rejects an image with no alt text", () => {
    const bad = { title: "Hi", image: { src: "/a.jpg", alt: "", width: 1, height: 1 } };
    expect(HeroConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a script URL", () => {
    const bad = { title: "Hi", primaryCta: { label: "x", href: "javascript:alert(1)" } };
    expect(HeroConfigSchema.safeParse(bad).success).toBe(false);
  });
});
