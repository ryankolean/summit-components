import { z } from "zod";

/**
 * Client-facing brand content that brand.json does not hold: logos, voice,
 * imagery and usage rules. It lives in the private intake folder as
 * brand-hub.json and renders, with brand.json, into the brand hub page that
 * Summit sends to the client. It never goes in a site repo.
 */

const Text = z.string().min(1);

/** A path inside the intake folder, such as assets/logos/primary.svg. */
const IntakePath = z
  .string()
  .regex(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._\/-]+$/, "a relative path inside the intake folder");

export const BrandHubLogo = z.object({
  name: Text,
  file: IntakePath,
  /** Brand color role to show the logo on, such as "bg", "fg" or "primary". */
  on: z.string().regex(/^[A-Za-z][A-Za-z0-9]*$/).default("bg"),
  usage: z.string().optional(),
});

export const BrandHubVoiceTrait = z.object({
  name: Text,
  description: Text,
  do: z.string().optional(),
  dont: z.string().optional(),
});

export const BrandHubCopyExample = z.object({
  context: Text,
  write: Text,
  avoid: z.string().optional(),
});

export const BrandHubSchema = z.object({
  tagline: z.string().optional(),
  summary: z.string().optional(),
  /** Shown in the header so the client knows which edition they hold. */
  version: z.string().default("1.0"),
  logos: z.array(BrandHubLogo).default([]),
  logoRules: z.object({ clearSpace: z.string().optional(), minSize: z.string().optional() }).default({}),
  /** How each color role is used, keyed by role name from brand.json. */
  colorUsage: z.record(z.string(), Text).default({}),
  /**
   * Stylesheets that load the brand fonts. Unset, the hub requests both
   * families from Google Fonts; set [] for fonts installed locally or licensed elsewhere.
   */
  fontStylesheets: z.array(z.url({ protocol: /^https$/ })).optional(),
  voice: z
    .object({
      summary: z.string().optional(),
      traits: z.array(BrandHubVoiceTrait).default([]),
      examples: z.array(BrandHubCopyExample).default([]),
    })
    .default({ traits: [], examples: [] }),
  imagery: z
    .object({ summary: z.string().optional(), keywords: z.array(Text).default([]) })
    .default({ keywords: [] }),
  rules: z.object({ do: z.array(Text).default([]), dont: z.array(Text).default([]) }).default({ do: [], dont: [] }),
  /** Footer line, such as "Prepared by Summit Software Solutions". */
  preparedBy: z.string().default("Prepared by Summit Software Solutions"),
});

export type BrandHubInput = z.input<typeof BrandHubSchema>;
export type BrandHub = z.output<typeof BrandHubSchema>;
