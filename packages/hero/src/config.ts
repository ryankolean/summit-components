import { z } from "zod";
import { Image } from "@summit/schemas";
import { isSafeHref } from "./types.js";

const Cta = z.object({
  label: z.string().min(1),
  href: z.string().min(1).refine(isSafeHref, "href must be http(s), mailto, tel or relative"),
});

/** Validated config for the hero, used by Decisions (site.config.json) and the registry. */
export const HeroConfigSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/).default("hero"),
  headingLevel: z.union([z.literal(1), z.literal(2)]).default(1),
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  lede: z.string().optional(),
  primaryCta: Cta.optional(),
  secondaryCta: Cta.optional(),
  image: Image.pick({ src: true, alt: true, width: true, height: true }).optional(),
  align: z.enum(["start", "center"]).default("start"),
});

export type HeroConfig = z.output<typeof HeroConfigSchema>;
