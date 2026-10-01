import { HeroConfigSchema } from "@summit/hero";
import { BrandSchema, EntitySchema } from "@summit/schemas";
import brandJson from "../../site/brand.json";
import entityJson from "../../site/entity.json";
import homeJson from "../../site/home.json";

// Everything the site says comes from site/*.json, validated at build time so a
// bad edit fails the build instead of shipping.
export const brand = BrandSchema.parse(brandJson);
export const entity = EntitySchema.parse(entityJson);
export const home = { title: homeJson.title, hero: HeroConfigSchema.parse(homeJson.hero) };

/** Defaults to preview, so nothing is indexed unless a build opts in. */
export const mode: "production" | "preview" = process.env.SITE_MODE === "production" ? "production" : "preview";

const basePath = process.env.BASE_PATH?.replace(/\/+$/, "") ?? "";
/** Absolute URL of the site root, including any base path. */
export const siteRoot = new URL(`${basePath}/`, process.env.SITE_URL ?? entity.url);
export const absolute = (path: string) => new URL(path.replace(/^\//, ""), siteRoot).href;

/** Next replaces openGraph wholesale when a page sets it, so pages spread this in. */
export const baseOpenGraph = { type: "website" as const, siteName: entity.name, images: [absolute("og.png")] };

const DAYS = { Mo: "Monday", Tu: "Tuesday", We: "Wednesday", Th: "Thursday", Fr: "Friday", Sa: "Saturday", Su: "Sunday" };

export function describeDays(days: Array<keyof typeof DAYS>): string {
  const names = days.map((d) => DAYS[d]);
  return names.length > 2 ? `${names[0]} to ${names[names.length - 1]}` : names.join(" and ");
}
