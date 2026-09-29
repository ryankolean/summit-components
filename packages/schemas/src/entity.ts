import { z } from "zod";

/**
 * Public facts about a business. This is the single source for page copy,
 * JSON-LD and llms.txt, and it is committed to the site repo, which is often
 * public. Never put private intake here (pain points, competitors, pricing
 * notes, personal contacts): that lives in the private Summit repo.
 */

export const Day = z.enum(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);

const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected 24h HH:MM");

/** `closes` earlier than `opens` means the period runs past midnight. */
export const OpeningHours = z.object({
  days: z.array(Day).min(1),
  opens: Time,
  closes: Time,
});

export const Address = z.object({
  street: z.string().min(1),
  locality: z.string().min(1),
  region: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2).default("US"),
});

export const Location = z.object({
  name: z.string().optional(),
  address: Address,
  geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  telephone: z.string().optional(),
  hours: z.array(OpeningHours).default([]),
  hoursNote: z.string().optional(),
});

export const MenuItem = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  /** Display string, because real menus say "MKT" and "$10 pp". */
  price: z.string().optional(),
  dietary: z.array(z.string()).default([]),
});

export const MenuSection = z.object({
  name: z.string().min(1),
  items: z.array(MenuItem),
});

export const Menu = z.object({
  name: z.string().min(1),
  url: z.string().optional(),
  sections: z.array(MenuSection).default([]),
});

export const Faq = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const Image = z.object({
  src: z.string().min(1),
  alt: z.string().min(1, "alt text is required"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: z.string().optional(),
});

export const TeamMember = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  bio: z.string().optional(),
  image: Image.optional(),
});

export const EntitySchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  /** schema.org type, e.g. Restaurant, BarOrPub, Bakery, GeneralContractor. */
  type: z.string().min(1).default("LocalBusiness"),
  description: z.string().min(1),
  url: z.url(),
  email: z.email().optional(),
  telephone: z.string().optional(),
  locations: z.array(Location).min(1),
  menus: z.array(Menu).default([]),
  faq: z.array(Faq).default([]),
  team: z.array(TeamMember).default([]),
  gallery: z.array(Image).default([]),
  sameAs: z.array(z.url()).default([]),
});

export type EntityInput = z.input<typeof EntitySchema>;
export type Entity = z.output<typeof EntitySchema>;
