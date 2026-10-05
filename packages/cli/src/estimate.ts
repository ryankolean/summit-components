import type { Engagement, RateCard, Registry, SiteConfig } from "@summit/schemas";

export interface EstimateLine {
  group: "baseline" | "pages" | "components" | "redirects" | "custom";
  label: string;
  hours: number;
  amount: number;
}

export interface Estimate {
  client: string;
  example: boolean;
  hourlyRate: number;
  lines: EstimateLine[];
  hours: number;
  subtotal: number;
  discount?: { label: string; amount: number };
  total: number;
  depositPercent: number;
  deposit: number;
  balance: number;
  maintenance?: { tier: string; monthlyFee: number; includedUpdateHours: number; inclusions: string[]; hourlyRate: number };
  /** Existing sections kept as they are: in scope, not priced. */
  kept: string[];
  /** Existing sections marked replace-later: quoted separately. */
  deferred: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "1,250" or "1,250.50". Templates supply the currency sign. */
export function formatAmount(n: number): string {
  return round2(n).toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(round2(n)) ? 0 : 2, maximumFractionDigits: 2 });
}

/**
 * Prices a validated site.config.json. Every line traces to the config, the
 * registry or the engagement, so changing a component changes the estimate
 * with no manual edit.
 */
export function buildEstimate(config: SiteConfig, registry: Registry, rates: RateCard, engagement: Engagement): Estimate {
  const lines: EstimateLine[] = [];
  const add = (group: EstimateLine["group"], label: string, hours: number, amount = hours * rates.hourlyRate) =>
    lines.push({ group, label, hours: round2(hours), amount: round2(amount) });

  for (const item of rates.baseline) add("baseline", item.label, item.hours);

  const kept: string[] = [];
  const deferred: string[] = [];
  for (const page of config.pages) {
    if (page.source === "new") add("pages", `${page.title} page (${page.path})`, rates.pageHours);
    for (const section of page.sections) {
      if (section.kind === "existing") {
        (section.decision === "keep" ? kept : deferred).push(`${page.path}: ${section.description}`);
        continue;
      }
      const entry = registry.components.find((c) => c.name === section.component);
      if (!entry) throw new Error(`${page.path} uses "${section.component}", which is not in the registry`);
      if (!entry.effort) throw new Error(`registry entry "${entry.name}" has no effort size, so it cannot be priced`);
      const adopt = section.status === "adopt";
      const hours = rates.effortHours[entry.effort] * (adopt ? rates.adoptFactor : 1);
      add("components", `${entry.name} component on ${page.path}${adopt ? ", replacing the existing one" : ""}`, hours);
    }
  }

  if (config.redirects.length && rates.redirectHours) {
    add("redirects", `${config.redirects.length} legacy redirect(s)`, config.redirects.length * rates.redirectHours);
  }
  for (const item of engagement.lineItems) {
    if (item.hours !== undefined) add("custom", item.label, item.hours);
    else add("custom", item.label, 0, item.amount);
  }

  const hours = round2(lines.reduce((sum, l) => sum + l.hours, 0));
  const subtotal = round2(lines.reduce((sum, l) => sum + l.amount, 0));
  const discount = engagement.discount ? { label: engagement.discount.label, amount: Math.min(engagement.discount.amount, subtotal) } : undefined;
  const total = round2(subtotal - (discount?.amount ?? 0));
  const deposit = round2((total * rates.depositPercent) / 100);

  let maintenance: Estimate["maintenance"];
  if (engagement.tier) {
    const tier = rates.tiers.find((t) => t.name === engagement.tier);
    if (!tier) throw new Error(`tier "${engagement.tier}" is not on the rate card (${rates.tiers.map((t) => t.name).join(", ")})`);
    maintenance = {
      tier: tier.name,
      monthlyFee: tier.monthlyFee,
      includedUpdateHours: tier.includedUpdateHours,
      inclusions: tier.inclusions,
      hourlyRate: rates.hourlyRate,
    };
  }

  return {
    client: config.client,
    example: rates.example,
    hourlyRate: rates.hourlyRate,
    lines,
    hours,
    subtotal,
    ...(discount ? { discount } : {}),
    total,
    depositPercent: rates.depositPercent,
    deposit,
    balance: round2(total - deposit),
    ...(maintenance ? { maintenance } : {}),
    kept,
    deferred,
  };
}
