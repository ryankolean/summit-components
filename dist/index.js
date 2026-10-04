const DAY_NAMES = {
    Mo: "Monday",
    Tu: "Tuesday",
    We: "Wednesday",
    Th: "Thursday",
    Fr: "Friday",
    Sa: "Saturday",
    Su: "Sunday",
};
const DAY_ORDER = Object.keys(DAY_NAMES);
const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)));
function postalAddress(location) {
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
function openingHours(hours) {
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
export function entityJsonLd(entity) {
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
        department: others.map((l) => compact({
            "@type": entity.type,
            name: l.name ?? entity.name,
            telephone: l.telephone,
            address: postalAddress(l),
            openingHoursSpecification: openingHours(l.hours),
        })),
    });
}
/** FAQPage JSON-LD from the same FAQ entries the page renders, or null when there are none. */
export function faqJsonLd(entity) {
    if (!entity.faq.length)
        return null;
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
export function serializeJsonLd(data) {
    return JSON.stringify(data).replace(/</g, "\\u003c");
}
/**
 * "Mo-Fr", or "Th-Mo" for a run that wraps past Sunday, or "Mo,We,Fr". The week
 * is treated as a circle: a run starts after the single gap in the day set.
 */
function dayRange(days) {
    const idx = [...new Set(days.map((d) => DAY_ORDER.indexOf(d)))].sort((a, b) => a - b);
    if (idx.length === 7)
        return "Mo-Su";
    const gaps = idx.filter((v, i) => idx[(i + 1) % idx.length] !== (v + 1) % 7);
    if (idx.length >= 2 && gaps.length === 1) {
        const end = gaps[0];
        const start = idx[(idx.indexOf(end) + 1) % idx.length];
        return `${DAY_ORDER[start]}-${DAY_ORDER[end]}`;
    }
    return idx.map((i) => DAY_ORDER[i]).join(",");
}
export function formatHours(hours) {
    return hours.map((h) => `${dayRange(h.days)} ${h.opens}-${h.closes}`).join("; ");
}
/**
 * llms.txt for answer engines: the facts people ask about, the pages, and the
 * FAQ, all from entity.json so it stays in step with the site.
 */
export function llmsTxt(entity, options = {}) {
    const out = [`# ${entity.name}`, "", `> ${entity.description}`, "", "## Facts", ""];
    for (const location of entity.locations) {
        const a = location.address;
        const label = entity.locations.length > 1 && location.name ? ` (${location.name})` : "";
        out.push(`- Address${label}: ${a.street}, ${a.locality}, ${a.region} ${a.postalCode}`);
        if (location.hours.length)
            out.push(`- Hours${label}: ${formatHours(location.hours)}`);
        if (location.hoursNote)
            out.push(`- Hours note${label}: ${location.hoursNote}`);
    }
    if (entity.telephone)
        out.push(`- Phone: ${entity.telephone}`);
    if (entity.email)
        out.push(`- Email: ${entity.email}`);
    out.push(`- Website: ${entity.url}`);
    for (const link of entity.sameAs)
        out.push(`- Also at: ${link}`);
    if (options.pages?.length) {
        out.push("", "## Pages", "");
        for (const p of options.pages)
            out.push(`- [${p.title}](${p.url})${p.description ? `: ${p.description}` : ""}`);
    }
    if (entity.faq.length) {
        out.push("", "## FAQ");
        for (const f of entity.faq)
            out.push("", `### ${f.question}`, "", f.answer);
    }
    return `${out.join("\n")}\n`;
}
/** Crawlers used for AI training rather than search; blocking them does not affect search ranking. */
export const AI_TRAINING_CRAWLERS = ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended", "Applebot-Extended", "PerplexityBot"];
export function robotsTxt({ mode, sitemapUrl, aiCrawlers = "allow" }) {
    if (mode === "preview")
        return "User-agent: *\nDisallow: /\n";
    const groups = [];
    if (aiCrawlers === "block") {
        for (const bot of AI_TRAINING_CRAWLERS)
            groups.push(`User-agent: ${bot}\nDisallow: /\n`);
    }
    groups.push("User-agent: *\nAllow: /\n");
    return `${groups.join("\n")}\nSitemap: ${sitemapUrl}\n`;
}
//# sourceMappingURL=index.js.map