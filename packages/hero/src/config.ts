import { z } from "zod";
import { Image } from "@summit/schemas";
import { isSafeHref } from "./types.js";

const Cta = z.object({
  label: z.string().min(1),
  href: z.string().min(1).refine(isSafeHref, "href must be http(s), mailto, tel or relative"),
});

const ImageSource = z.object({
  type: z.string().regex(/^image\/[a-z0-9.+-]+$/, "a MIME type such as image/avif"),
  srcset: z.string().min(1),
  sizes: z.string().min(1).optional(),
});

const HeroImage = Image.pick({ src: true, alt: true, width: true, height: true }).extend({
  srcset: z.string().min(1).optional(),
  sizes: z.string().min(1).optional(),
  sources: z.array(ImageSource).optional(),
  fetchpriority: z.enum(["high", "low", "auto"]).optional(),
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
  image: HeroImage.optional(),
  align: z.enum(["start", "center"]).default("start"),
  layout: z.enum(["split", "stacked"]).default("split"),
});

export type HeroConfig = z.output<typeof HeroConfigSchema>;
