import type { Engagement, Entity, RateCard } from "@summit/schemas";
import { formatAmount, type Estimate } from "./estimate.js";

type Value = string | string[];

export interface FilledContract {
  markdown: string;
  /** Placeholders with no value, e.g. "{{CLIENT_ADDRESS}}". */
  unresolved: string[];
  /** Lines still marked with a warning sign: a decision or a fact to confirm. */
  decisions: Array<{ line: number; text: string }>;
}

/**
 * Placeholder values computed from the estimate and rate card. They cannot be
 * overridden by hand, so the contract cannot drift from the quoted numbers.
 */
export function derivedContractValues(estimate: Estimate, rates: RateCard, engagement: Engagement, entity: Entity, liveUrl?: string): Record<string, Value> {
  const m = estimate.maintenance;
  if (!m) throw new Error("the contract is a maintenance agreement; set a tier in engagement.json");
  const hours = m.includedUpdateHours;
  return {
    CLIENT_LEGAL_NAME: engagement.clientLegalName,
    PROPERTY_NAME: entity.name,
    PROPERTY_DOMAIN: new URL(liveUrl ?? entity.url).hostname,
    SERVICE_TIER: m.tier,
    MONTHLY_FEE: formatAmount(m.monthlyFee),
    INCLUDED_UPDATE_ALLOWANCE: `${hours} hour${hours === 1 ? "" : "s"}`,
    HOURLY_RATE: formatAmount(rates.hourlyRate),
    AFTER_HOURS_RATE: formatAmount(rates.afterHoursRate),
    SETUP_FEE: formatAmount(estimate.total),
    // The template has two inclusion bullets. The first repeats once per tier
    // inclusion and the second is dropped, so any number of inclusions fits.
    TIER_INCLUSION_1: m.inclusions,
    TIER_INCLUSION_2: [],
  };
}

/** Rate card defaults, then the engagement, then derived values. A derived key set by hand is an error. */
export function mergeContractValues(rates: RateCard, engagement: Engagement, derived: Record<string, Value>): Record<string, Value> {
  for (const key of Object.keys(derived)) {
    if (key in engagement.contract) throw new Error(`contract.${key} is computed from the estimate and rate card; remove it from engagement.json`);
    if (key in rates.contractDefaults) throw new Error(`contractDefaults.${key} is computed from the estimate and rate card; remove it from the rate card`);
  }
  return { ...rates.contractDefaults, ...engagement.contract, ...derived };
}

const PLACEHOLDER = /\{\{([A-Z0-9_]+)\}\}/g;

/** Fills a SUMMIT-196 template and strips its template banner and drafting notes. */
export function fillContract(template: string, values: Record<string, Value>): FilledContract {
  const out: string[] = [];
  const lines = template.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // The "TEMPLATE, do not send as-is" block quote at the top.
    if (/^>\s*\*\*TEMPLATE/.test(line)) {
      while (i + 1 < lines.length && /^>/.test(lines[i + 1]!)) i++;
      continue;
    }
    // "[Drafting note: ...]" paragraphs, which may wrap over several lines.
    if (line.startsWith("[Drafting note:")) {
      while (!lines[i]!.trimEnd().endsWith("]") && i + 1 < lines.length && lines[i + 1]!.trim()) i++;
      continue;
    }
    const keys = [...line.matchAll(PLACEHOLDER)].map((m) => m[1]!);
    const lists = keys.map((k) => values[k]).filter(Array.isArray);
    const copies = lists.length ? Math.max(...lists.map((l) => l.length)) : 1;
    for (let n = 0; n < copies; n++) {
      out.push(
        line.replace(PLACEHOLDER, (whole, key: string) => {
          const value = values[key];
          if (value === undefined) return whole;
          return Array.isArray(value) ? (value[n] ?? "") : value;
        }),
      );
    }
  }
  const markdown = out.join("\n").replace(/\n{3,}/g, "\n\n");
  const unresolved = [...new Set([...markdown.matchAll(PLACEHOLDER)].map((m) => m[0]))];
  const decisions = markdown
    .split("\n")
    .map((text, n) => ({ line: n + 1, text: text.trim() }))
    .filter(({ text }) => text.includes("⚠"));
  return { markdown, unresolved, decisions };
}
