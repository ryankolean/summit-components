import { describe, expect, it } from "vitest";
import { EntitySchema } from "@summit/schemas";
import { entityJsonLd, faqJsonLd, llmsTxt, robotsTxt, serializeJsonLd } from "@summit/seo";

const entity = EntitySchema.parse({
  name: "Demo Diner",
  type: "Restaurant",
  description: "Breakfast and brunch in Ferndale.",
  url: "https://demo.example/",
  telephone: "+1-248-555-0100",
  locations: [
    {
      address: { street: "1 Main St", locality: "Ferndale", region: "MI", postalCode: "48220" },
      geo: { lat: 42.46, lng: -83.13 },
      hours: [
        { days: ["Mo", "Tu", "We", "Th", "Fr"], opens: "08:00", closes: "15:00" },
        { days: ["Sa", "Su"], opens: "09:00", closes: "14:00" },
      ],
    },
  ],
  menus: [{ name: "Breakfast", url: "https://demo.example/menu" }],
  faq: [{ question: "Do you take reservations?", answer: "Walk-in only." }],
  sameAs: ["https://instagram.com/demo"],
});

describe("entityJsonLd", () => {
  const ld = entityJsonLd(entity) as Record<string, any>;

  it("uses the entity's schema.org type and core facts", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Restaurant");
    expect(ld.name).toBe("Demo Diner");
    expect(ld.sameAs).toEqual(["https://instagram.com/demo"]);
    expect(ld.hasMenu).toBe("https://demo.example/menu");
  });

  it("maps address, geo and opening hours", () => {
    expect(ld.address).toMatchObject({ "@type": "PostalAddress", addressLocality: "Ferndale", addressCountry: "US" });
    expect(ld.geo).toEqual({ "@type": "GeoCoordinates", latitude: 42.46, longitude: -83.13 });
    expect(ld.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "15:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday", "Sunday"], opens: "09:00", closes: "14:00" },
    ]);
  });

  it("omits fields the entity does not have", () => {
    const bare = entityJsonLd(EntitySchema.parse({ ...entity, telephone: undefined, menus: [] })) as Record<string, any>;
    expect("telephone" in bare).toBe(false);
    expect("hasMenu" in bare).toBe(false);
  });
});

describe("faqJsonLd", () => {
  it("builds an FAQPage from the same FAQ the page shows", () => {
    expect(faqJsonLd(entity)).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Do you take reservations?", acceptedAnswer: { "@type": "Answer", text: "Walk-in only." } },
      ],
    });
  });

  it("returns null with no FAQ", () => {
    expect(faqJsonLd(EntitySchema.parse({ ...entity, faq: [] }))).toBeNull();
  });
});

describe("serializeJsonLd", () => {
  it("escapes characters that could close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});

describe("llmsTxt", () => {
  const txt = llmsTxt(entity, { pages: [{ title: "Menu", url: "https://demo.example/menu", description: "Full menu" }] });

  it("leads with the name and description", () => {
    expect(txt.startsWith("# Demo Diner\n\n> Breakfast and brunch in Ferndale.\n")).toBe(true);
  });

  it("states the facts answer engines are asked about", () => {
    expect(txt).toContain("- Address: 1 Main St, Ferndale, MI 48220");
    expect(txt).toContain("- Hours: Mo-Fr 08:00-15:00; Sa-Su 09:00-14:00");
    expect(txt).toContain("- Phone: +1-248-555-0100");
  });

  it("lists pages and the FAQ", () => {
    expect(txt).toContain("- [Menu](https://demo.example/menu): Full menu");
    expect(txt).toContain("### Do you take reservations?\n\nWalk-in only.");
  });
});

describe("robotsTxt", () => {
  it("opens production and points at the sitemap", () => {
    expect(robotsTxt({ mode: "production", sitemapUrl: "https://demo.example/sitemap-index.xml" })).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://demo.example/sitemap-index.xml\n",
    );
  });

  it("closes previews completely", () => {
    expect(robotsTxt({ mode: "preview", sitemapUrl: "https://x/sitemap.xml" })).toBe("User-agent: *\nDisallow: /\n");
  });

  it("can block AI training crawlers while staying open to search", () => {
    const txt = robotsTxt({ mode: "production", sitemapUrl: "https://x/s.xml", aiCrawlers: "block" });
    expect(txt).toContain("User-agent: GPTBot\nDisallow: /");
    expect(txt).toContain("User-agent: Google-Extended\nDisallow: /");
    expect(txt).toContain("User-agent: *\nAllow: /");
  });
});
