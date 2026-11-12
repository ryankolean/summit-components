import { z } from "zod";
import { EFFORT_SIZES } from "./registry.js";

// The shapes below are public; the values never are. A real rate card and every
// engagement.json live in the private summit-intake repo (SUMMIT-247).

const Kebab = z.string().regex(/^[a-z][a-z0-9-]*$/, "lowercase kebab-case");
const Hours = z.number().nonnegative();
const Amount = z.number().nonnegative();
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export const MaintenanceTier = z.object({
  name: z.string().min(1),
  monthlyFee: Amount,
  includedUpdateHours: Hours,
  /** What this tier adds beyond the baseline services; fills contract Schedule A. */
  inclusions: z.array(z.string().min(1)).default([]),
});

/** Summit-wide pricing. Every estimate, contract and proposal is computed from it. */
export const RateCardSchema = z
  .object({
    schemaVersion: z.literal(1),
    /** Example rates for tests and demos. Every document rendered from one is watermarked. */
    example: z.boolean().default(false),
    currency: z.literal("USD").default("USD"),
    hourlyRate: z.number().positive(),
    afterHoursRate: z.number().positive(),
    /** Hours to place and configure one registry component, keyed by its registry effort size. */
    effortHours: z.object(Object.fromEntries(EFFORT_SIZES.map((s) => [s, Hours])) as Record<(typeof EFFORT_SIZES)[number], typeof Hours>),
    /** Share of effortHours charged when a component replaces an element an existing site already has. */
    adoptFactor: z.number().min(0).max(1).default(0.5),
    /** Hours per new page: layout, content placement and review. */
    pageHours: Hours,
    /** Hours per legacy redirect. */
    redirectHours: Hours.default(0),
    /** Work every project carries, such as discovery, launch QA and handover. */
    baseline: z.array(z.object({ label: z.string().min(1), hours: Hours })).default([]),
    /** Share of the build total due at acceptance; the balance is due at launch. */
    depositPercent: z.number().min(0).max(100).default(50),
    tiers: z.array(MaintenanceTier).min(1),
    /** Contract placeholder values shared by every client: provider address, response targets, payment terms. */
    contractDefaults: z.record(z.string(), z.string()).default({}),
    /** Maintenance agreement template (SUMMIT-196), relative to the rate card file. */
    contractTemplate: z.string().optional(),
    /** Cloudflare Pages project that hosts proposals at unlisted URLs. */
    proposals: z
      .object({ project: Kebab.default("summit-proposals"), baseUrl: z.url().optional() })
      .default({ project: "summit-proposals" }),
  })
  .superRefine((card, ctx) => {
    const seen = new Set<string>();
    card.tiers.forEach((t, i) => {
      if (seen.has(t.name)) ctx.addIssue({ code: "custom", path: ["tiers", i, "name"], message: `duplicate tier "${t.name}"` });
      seen.add(t.name);
    });
  });

export const LineItem = z
  .object({ label: z.string().min(1), hours: Hours.optional(), amount: Amount.optional() })
  .refine((item) => (item.hours === undefined) !== (item.amount === undefined), "set hours or amount, not both");

/** One client's commercial terms. Private: it names the client's legal entity and contacts. */
export const EngagementSchema = z.object({
  schemaVersion: z.literal(1),
  client: Kebab,
  clientLegalName: z.string().min(1),
  /** Unguessable path segment for the hosted proposal. Changing it breaks the shared link. */
  proposalSlug: z.string().regex(/^[a-z0-9]{16,64}$/, "16 to 64 lowercase letters and digits"),
  preparedOn: IsoDate,
  validDays: z.number().int().positive().default(30),
  /** Maintenance tier from the rate card. Omit for a build with no ongoing care. */
  tier: z.string().optional(),
  /** Custom work outside the registry. */
  lineItems: z.array(LineItem).default([]),
  discount: z.object({ label: z.string().min(1), amount: z.number().positive() }).optional(),
  /** Things the client might assume are included and are not. */
  exclusions: z.array(z.string().min(1)).default([]),
  links: z.object({ preview: z.url().optional(), styleGuide: z.url().optional() }).default({}),
  /** Contract placeholder values for this client. An array repeats the template line once per value. */
  contract: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
});

export type RateCardInput = z.input<typeof RateCardSchema>;
export type RateCard = z.output<typeof RateCardSchema>;
export type EngagementInput = z.input<typeof EngagementSchema>;
export type Engagement = z.output<typeof EngagementSchema>;
