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

  it("refuses script URLs", () => {
    expect(() =>
      renderHero({ title: "Hi", primaryCta: { label: "x", href: "javascript:alert(1)" } }),
    ).toThrow(/unsafe href/);
  });
});

describe("HeroConfigSchema", () => {
  it("applies defaults", () => {
    const config = HeroConfigSchema.parse({ title: "Hi" });
    expect(config).toMatchObject({ id: "hero", headingLevel: 1, align: "start" });
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
