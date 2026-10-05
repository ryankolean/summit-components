import { describe, expect, it } from "vitest";
import { BrandSchema, EngagementSchema, EntitySchema, RateCardSchema, RegistrySchema } from "@summit/schemas";

const brand = {
  name: "Demo Diner",
  colors: {
    bg: "#F5F2EF",
    fg: "#1A120B",
    muted: "#5C5046",
    primary: "#471515",
    onPrimary: "#FFFFFF",
    accent: "#D3A75A",
  },
  fonts: {
    display: { family: "Fraunces", fallback: "Georgia, serif" },
    body: { family: "Jost", fallback: "system-ui, sans-serif" },
  },
};

const entity = {
  name: "Demo Diner",
  description: "Breakfast and brunch.",
  url: "https://demo.example",
  locations: [
    {
      address: {
        street: "1 Main St",
        locality: "Ferndale",
        region: "MI",
        postalCode: "48220",
      },
      hours: [{ days: ["Mo", "Tu"], opens: "08:00", closes: "15:00" }],
    },
  ],
};

const entry = {
  name: "hero",
  package: "@summit/hero",
  version: "0.1.0",
  description: "Page hero",
  kind: "component",
  stacks: ["astro", "static-html"],
  entrypoints: { react: "@summit/hero", html: "@summit/hero/html" },
  effort: "s",
};

describe("BrandSchema", () => {
  it("accepts a complete brand and fills defaults", () => {
    const parsed = BrandSchema.parse(brand);
    expect(parsed.radius).toBe("0");
  });

  it("rejects a color that is not hex", () => {
    const bad = { ...brand, colors: { ...brand.colors, primary: "red" } };
    expect(BrandSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects font and radius values that could break out of a style tag", () => {
    const family = { ...brand, fonts: { ...brand.fonts, display: { family: "X</style><script>" } } };
    const fallback = { ...brand, fonts: { ...brand.fonts, body: { family: "Jost", fallback: "a;}body{x" } } };
    expect(BrandSchema.safeParse(family).success).toBe(false);
    expect(BrandSchema.safeParse(fallback).success).toBe(false);
    expect(BrandSchema.safeParse({ ...brand, radius: "4px;}" }).success).toBe(false);
    expect(BrandSchema.safeParse({ ...brand, radius: "0.5rem" }).success).toBe(true);
  });

  it("requires every core color role", () => {
    const { accent: _accent, ...colors } = brand.colors;
    expect(BrandSchema.safeParse({ ...brand, colors }).success).toBe(false);
  });
});

describe("EntitySchema", () => {
  it("accepts a minimal entity and defaults country and sameAs", () => {
    const parsed = EntitySchema.parse(entity);
    expect(parsed.locations[0]?.address.country).toBe("US");
    expect(parsed.sameAs).toEqual([]);
  });

  it("requires at least one location", () => {
    expect(EntitySchema.safeParse({ ...entity, locations: [] }).success).toBe(false);
  });

  it("rejects a malformed opening time", () => {
    const bad = structuredClone(entity);
    bad.locations[0]!.hours[0]!.opens = "8am";
    expect(EntitySchema.safeParse(bad).success).toBe(false);
  });

  it("requires alt text on gallery images", () => {
    const bad = { ...entity, gallery: [{ src: "/a.jpg", alt: "", width: 10, height: 10 }] };
    expect(EntitySchema.safeParse(bad).success).toBe(false);
  });
});

describe("RegistrySchema", () => {
  it("accepts a valid registry", () => {
    expect(RegistrySchema.safeParse({ schemaVersion: 1, components: [entry] }).success).toBe(true);
  });

  it("rejects duplicate component names", () => {
    const result = RegistrySchema.safeParse({ schemaVersion: 1, components: [entry, entry] });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown stack", () => {
    const bad = { ...entry, stacks: ["wordpress"] };
    expect(RegistrySchema.safeParse({ schemaVersion: 1, components: [bad] }).success).toBe(false);
  });

  it("rejects a static-html stack with no html or embed entrypoint", () => {
    const bad = { ...entry, entrypoints: { react: "@summit/hero" } };
    expect(RegistrySchema.safeParse({ schemaVersion: 1, components: [bad] }).success).toBe(false);
  });

  it("rejects a framework stack with no react or html entrypoint", () => {
    const bad = { ...entry, stacks: ["next"], entrypoints: { embed: "@summit/hero/embed" } };
    expect(RegistrySchema.safeParse({ schemaVersion: 1, components: [bad] }).success).toBe(false);
  });
});

describe("RegistrySchema pricing", () => {
  it("requires an effort size on components but not on tooling", () => {
    const { effort: _effort, ...unsized } = entry;
    expect(RegistrySchema.safeParse({ schemaVersion: 1, components: [unsized] }).success).toBe(false);
    const tooling = { ...unsized, name: "checks", package: "@summit/checks", kind: "tooling", entrypoints: { cli: "summit-check", html: "x" } };
    expect(RegistrySchema.safeParse({ schemaVersion: 1, components: [tooling] }).success).toBe(true);
  });
});

const rateCard = {
  schemaVersion: 1,
  hourlyRate: 100,
  afterHoursRate: 150,
  effortHours: { xs: 1, s: 2, m: 4, l: 8, xl: 16 },
  pageHours: 3,
  tiers: [{ name: "Basic", monthlyFee: 50, includedUpdateHours: 1 }],
};

describe("RateCardSchema", () => {
  it("fills defaults: not an example, half up front, the summit-proposals project", () => {
    const parsed = RateCardSchema.parse(rateCard);
    expect(parsed).toMatchObject({ example: false, depositPercent: 50, adoptFactor: 0.5, proposals: { project: "summit-proposals" } });
  });

  it("needs an hour figure for every effort size and unique tier names", () => {
    expect(RateCardSchema.safeParse({ ...rateCard, effortHours: { xs: 1, s: 2 } }).success).toBe(false);
    expect(RateCardSchema.safeParse({ ...rateCard, tiers: [...rateCard.tiers, ...rateCard.tiers] }).success).toBe(false);
  });
});

describe("EngagementSchema", () => {
  const engagement = { schemaVersion: 1, client: "demo", clientLegalName: "Demo LLC", proposalSlug: "a1b2c3d4e5f6g7h8", preparedOn: "2026-10-05" };

  it("accepts a minimal engagement", () => {
    expect(EngagementSchema.parse(engagement)).toMatchObject({ validDays: 30, lineItems: [], contract: {} });
  });

  it("rejects a guessable proposal slug", () => {
    expect(EngagementSchema.safeParse({ ...engagement, proposalSlug: "demo" }).success).toBe(false);
  });

  it("needs hours or an amount on a line item, not both", () => {
    expect(EngagementSchema.safeParse({ ...engagement, lineItems: [{ label: "x" }] }).success).toBe(false);
    expect(EngagementSchema.safeParse({ ...engagement, lineItems: [{ label: "x", hours: 1, amount: 5 }] }).success).toBe(false);
  });
});
