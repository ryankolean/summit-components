import type { Entity } from "@summit/schemas";

const DAY_NAMES = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
  Su: "Sunday",
} as const;
const DAY_ORDER = Object.keys(DAY_NAMES) as Array<keyof typeof DAY_NAMES>;

type Location = Entity["locations"][number];
type Hours = Location["hours"][number];

const compact = <T extends Record<string, unknown>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)));

function postalAddress(location: Location) {
  const a = location.address;
  return {
    "@type": "PostalAddress",
    streetAddress: a.street,
    addressLocality: a.locality,
    addressRegion: a.region,
    postalCode: a.postalCode,
    addressCountry: a.country,
  };
}

function openingHours(hours: Hours[]) {
  return hours.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: h.days.map((d) => DAY_NAMES[d]),
    opens: h.opens,
    closes: h.closes,
  }));
}

/**
 * The business as JSON-LD, generated from entity.json so the structured data
 * can never disagree with the page. The first location is the primary one;
 * any others are listed as departments.
 */
export function entityJsonLd(entity: Entity): Record<string, unknown> {
  const [primary, ...others] = entity.locations;
  return compact({
    "@context": "https://schema.org",
    "@type": entity.type,
    name: entity.name,
    legalName: entity.legalName,
    description: entity.description,
    url: entity.url,
    telephone: entity.telephone ?? primary?.telephone,
    email: entity.email,
    address: primary && postalAddress(primary),
    geo: primary?.geo && { "@type": "GeoCoordinates", latitude: primary.geo.lat, longitude: primary.geo.lng },
    openingHoursSpecification: primary && openingHours(primary.hours),
    hasMenu: entity.menus.find((m) => m.url)?.url,
    sameAs: entity.sameAs,
    department: others.map((l) =>
      compact({
        "@type": entity.type,
        name: l.name ?? entity.name,
        telephone: l.telephone,
        address: postalAddress(l),
        openingHoursSpecification: openingHours(l.hours),
      }),
    ),
  });
}

/** FAQPage JSON-LD from the same FAQ entries the page renders, or null when there are none. */
export function faqJsonLd(entity: Entity): Record<string, unknown> | null {
  if (!entity.faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entity.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** JSON for a <script type="application/ld+json"> body; "<" is escaped so the data cannot close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function dayRange(days: Hours["days"]): string {
  const idx = days.map((d) => DAY_ORDER.indexOf(d)).sort((a, b) => a - b);
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1]! + 1);
  if (contiguous && idx.length > 2) return `${DAY_ORDER[idx[0]!]}-${DAY_ORDER[idx[idx.length - 1]!]}`;
  if (contiguous && idx.length === 2) return `${DAY_ORDER[idx[0]!]}-${DAY_ORDER[idx[1]!]}`;
  return idx.map((i) => DAY_ORDER[i]).join(",");
}

export function formatHours(hours: Hours[]): string {
  return hours.map((h) => `${dayRange(h.days)} ${h.opens}-${h.closes}`).join("; ");
}

export interface LlmsPage {
  title: string;
  url: string;
  description?: string;
}

/**
 * llms.txt for answer engines: the facts people ask about, the pages, and the
 * FAQ, all from entity.json so it stays in step with the site.
 */
export function llmsTxt(entity: Entity, options: { pages?: LlmsPage[] } = {}): string {
  const out = [`# ${entity.name}`, "", `> ${entity.description}`, "", "## Facts", ""];
  for (const location of entity.locations) {
    const a = location.address;
    const label = entity.locations.length > 1 && location.name ? ` (${location.name})` : "";
    out.push(`- Address${label}: ${a.street}, ${a.locality}, ${a.region} ${a.postalCode}`);
    if (location.hours.length) out.push(`- Hours${label}: ${formatHours(location.hours)}`);
    if (location.hoursNote) out.push(`- Hours note${label}: ${location.hoursNote}`);
  }
  if (entity.telephone) out.push(`- Phone: ${entity.telephone}`);
  if (entity.email) out.push(`- Email: ${entity.email}`);
  out.push(`- Website: ${entity.url}`);
  for (const link of entity.sameAs) out.push(`- Also at: ${link}`);

  if (options.pages?.length) {
    out.push("", "## Pages", "");
    for (const p of options.pages) out.push(`- [${p.title}](${p.url})${p.description ? `: ${p.description}` : ""}`);
  }
  if (entity.faq.length) {
    out.push("", "## FAQ");
    for (const f of entity.faq) out.push("", `### ${f.question}`, "", f.answer);
  }
  return `${out.join("\n")}\n`;
}

/** Crawlers used for AI training rather than search; blocking them does not affect search ranking. */
export const AI_TRAINING_CRAWLERS = ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended", "Applebot-Extended", "PerplexityBot"];

export interface RobotsOptions {
  mode: "production" | "preview";
  sitemapUrl: string;
  /** Explicit per-client policy (SUMMIT-252). Defaults to allow. */
  aiCrawlers?: "allow" | "block";
}

export function robotsTxt({ mode, sitemapUrl, aiCrawlers = "allow" }: RobotsOptions): string {
  if (mode === "preview") return "User-agent: *\nDisallow: /\n";
  const groups: string[] = [];
  if (aiCrawlers === "block") {
    for (const bot of AI_TRAINING_CRAWLERS) groups.push(`User-agent: ${bot}\nDisallow: /\n`);
  }
  groups.push("User-agent: *\nAllow: /\n");
  return `${groups.join("\n")}\nSitemap: ${sitemapUrl}\n`;
}
