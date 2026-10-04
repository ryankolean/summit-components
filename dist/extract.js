// Existing-repo intake: derive a draft brand.json from a site's CSS and a draft
// entity.json from its JSON-LD. Every brand role records where it came from and
// whether it was measured from a rule that uses it or inferred.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse } from "node-html-parser";
import { contrastRatio } from "@summit/tokens";
/** Flat rules, including those nested in at-rules. Good enough for intake, not a full parser. */
export function parseCss(css) {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = [];
    for (const [, selector = "", body = ""] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const decls = {};
        for (const part of body.split(";")) {
            const i = part.indexOf(":");
            if (i > 0)
                decls[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
        }
        // Statement at-rules (@import, @charset) end with ";" and are not rules, so a
        // selector is only the text after the last one.
        const clause = selector.slice(selector.lastIndexOf(";") + 1);
        rules.push({ selector: clause.trim().replace(/\s+/g, " "), decls });
    }
    return rules.filter((r) => !r.selector.startsWith("@"));
}
export function resolveValue(value, vars, depth = 0) {
    if (depth > 10)
        return value;
    return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (_, name, fallback) => {
        const found = vars.get(name);
        if (found !== undefined)
            return resolveValue(found, vars, depth + 1);
        return fallback !== undefined ? resolveValue(fallback.trim(), vars, depth + 1) : "";
    });
}
function toHex(value) {
    const hex = value.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/)?.[0];
    if (hex) {
        const h = hex.slice(1);
        return `#${(h.length === 3 ? [...h].map((c) => c + c).join("") : h).toUpperCase()}`;
    }
    const rgb = value.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)/);
    if (rgb && (rgb[4] === undefined || Number.parseFloat(rgb[4]) >= 1)) {
        return `#${rgb.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    }
    if (/\bwhite\b/i.test(value))
        return "#FFFFFF";
    if (/\bblack\b/i.test(value))
        return "#000000";
    return undefined;
}
function walk(root) {
    const out = [];
    const visit = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.name.startsWith(".") || entry.name === "node_modules")
                continue;
            const full = join(dir, entry.name);
            if (entry.isDirectory())
                visit(full);
            else
                out.push(relative(root, full).split(sep).join("/"));
        }
    };
    visit(root);
    return out;
}
/** HTML pages with index.html first, so the home page wins ties. */
function htmlPages(root) {
    return walk(root)
        .filter((f) => f.endsWith(".html"))
        .sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));
}
const selectors = (rule) => rule.selector.split(",").map((s) => s.trim());
const BASE_BUTTON = /^(?:\.btn|\.button|button)$/;
const BUTTON_VARIANT = /^\.(?:btn|button)(?:--|-)[\w-]+$/;
function fontStack(value) {
    const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
    const first = parts.shift();
    if (!first)
        return undefined;
    const family = first.replace(/^['"]|['"]$/g, "").replace(/[^A-Za-z0-9 -]/g, "").trim();
    if (!family)
        return undefined;
    const fallback = parts.join(", ").replace(/[^A-Za-z0-9 ,"'-]/g, "") || "system-ui, sans-serif";
    return { family, fallback };
}
export function extractBrand(root, name) {
    const files = walk(root);
    const css = files.filter((f) => f.endsWith(".css")).map((f) => readFileSync(join(root, f), "utf8"));
    for (const page of htmlPages(root)) {
        for (const style of parse(readFileSync(join(root, page), "utf8")).querySelectorAll("style"))
            css.push(style.rawText);
    }
    const rules = css.flatMap(parseCss);
    const vars = new Map();
    for (const rule of rules.filter((r) => selectors(r).some((s) => s === ":root" || s === "html"))) {
        for (const [k, v] of Object.entries(rule.decls))
            if (k.startsWith("--"))
                vars.set(k, v);
    }
    const local = (rule) => {
        const scoped = new Map(vars);
        for (const [k, v] of Object.entries(rule.decls))
            if (k.startsWith("--"))
                scoped.set(k, v);
        return scoped;
    };
    const colorOf = (rule, prop) => {
        const raw = prop === "color" ? rule.decls.color : rule.decls["background-color"] ?? rule.decls.background;
        if (!raw)
            return undefined;
        const value = toHex(resolveValue(raw, local(rule)));
        return value;
    };
    const roles = {};
    const set = (role, value, source, measured) => {
        if (value && !roles[role])
            roles[role] = { value, source, measured };
    };
    const body = rules.filter((r) => selectors(r).includes("body"));
    for (const rule of body) {
        set("bg", colorOf(rule, "background"), "body background", true);
        set("fg", colorOf(rule, "color"), "body color", true);
    }
    for (const rule of rules.filter((r) => selectors(r).some((s) => BASE_BUTTON.test(s)))) {
        set("primary", colorOf(rule, "background"), `${rule.selector} background`, true);
        set("onPrimary", colorOf(rule, "color"), `${rule.selector} color`, true);
    }
    // A variant often only overrides custom properties (--bg) and inherits the
    // base button's `background: var(--bg)`, so evaluate that with its variables.
    const baseButton = rules.find((r) => selectors(r).some((s) => BASE_BUTTON.test(s)) && (r.decls.background || r.decls["background-color"]));
    const baseBackground = baseButton && (baseButton.decls["background-color"] ?? baseButton.decls.background);
    for (const rule of rules.filter((r) => selectors(r).some((s) => BUTTON_VARIANT.test(s)))) {
        const raw = rule.decls["background-color"] ?? rule.decls.background ?? baseBackground;
        if (!raw)
            continue;
        const scoped = new Map(vars);
        for (const r of [baseButton, rule]) {
            for (const [k, v] of Object.entries(r?.decls ?? {}))
                if (k.startsWith("--"))
                    scoped.set(k, v);
        }
        const bg = toHex(resolveValue(raw, scoped));
        if (bg && bg !== roles.primary?.value)
            set("accent", bg, `${rule.selector} background`, true);
    }
    set("bg", "#FFFFFF", "default, no body background found", false);
    set("fg", "#111111", "default, no body color found", false);
    const bg = roles.bg.value;
    // Muted: the most used other text color that still meets AA on the page.
    const taken = new Set([roles.fg.value, roles.primary?.value, roles.onPrimary?.value]);
    const textColors = new Map();
    for (const rule of rules) {
        const c = colorOf(rule, "color");
        if (c && !taken.has(c))
            textColors.set(c, (textColors.get(c) ?? 0) + 1);
    }
    const muted = [...textColors.entries()]
        .filter(([c]) => contrastRatio(c, bg) >= 4.5)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
    set("muted", muted, "most used secondary text color meeting AA on bg", false);
    set("muted", roles.fg.value, "no secondary text color found, using fg", false);
    set("primary", roles.fg.value, "no button found, using fg", false);
    const primary = roles.primary.value;
    set("onPrimary", contrastRatio("#FFFFFF", primary) >= contrastRatio("#000000", primary) ? "#FFFFFF" : "#000000", "best contrast on primary", false);
    const palette = [...new Set([...vars.values()].map((v) => toHex(resolveValue(v, vars))).filter((v) => !!v))];
    const saturation = (hex) => {
        const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
        return Math.max(r, g, b) - Math.min(r, g, b);
    };
    const used = new Set(Object.values(roles).map((r) => r.value));
    const accent = palette.filter((c) => !used.has(c)).sort((a, b) => saturation(b) - saturation(a))[0];
    set("accent", accent, "most saturated unused palette color", false);
    set("accent", primary, "no accent found, using primary", false);
    const fontRule = (match) => rules.find((r) => selectors(r).some(match) && r.decls["font-family"]);
    const bodyFontRule = fontRule((s) => s === "body");
    const displayFontRule = fontRule((s) => /(^|\s)h1$/.test(s));
    const bodyFont = bodyFontRule && fontStack(resolveValue(bodyFontRule.decls["font-family"], vars));
    const displayFont = (displayFontRule && fontStack(resolveValue(displayFontRule.decls["font-family"], vars))) ?? bodyFont;
    const fallbackFont = { family: "system-ui", fallback: "sans-serif" };
    const radiusVar = [...vars.entries()].find(([k]) => /radius/.test(k))?.[1];
    const radius = radiusVar && resolveValue(radiusVar, vars).trim();
    const brand = {
        name,
        colors: {
            bg: roles.bg.value,
            fg: roles.fg.value,
            muted: roles.muted.value,
            primary,
            onPrimary: roles.onPrimary.value,
            accent: roles.accent.value,
        },
        fonts: { display: displayFont ?? fallbackFont, body: bodyFont ?? fallbackFont },
        ...(radius && /^(?:0|\d*\.?\d+(?:px|rem|em|%))$/.test(radius) ? { radius } : {}),
    };
    return { brand, roles, palette };
}
const DAYS = {
    monday: "Mo", tuesday: "Tu", wednesday: "We", thursday: "Th", friday: "Fr", saturday: "Sa", sunday: "Su",
};
const BUSINESS = /Business|Restaurant|Bar|Pub|Bakery|Cafe|Store|Shop|Organization|Contractor|Establishment|Service/;
function jsonLdNodes(html) {
    const out = [];
    for (const script of parse(html).querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const data = JSON.parse(script.rawText);
            for (const item of Array.isArray(data) ? data : [data]) {
                out.push(...(item && Array.isArray(item["@graph"]) ? item["@graph"] : [item]));
            }
        }
        catch {
            // invalid JSON-LD is reported by @summit/checks; intake just skips it
        }
    }
    return out.filter((n) => n && typeof n === "object");
}
const typeOf = (node) => (Array.isArray(node["@type"]) ? node["@type"][0] : node["@type"]);
const time = (t) => (typeof t === "string" ? t.slice(0, 5) : "");
export function extractEntity(root) {
    const pages = htmlPages(root);
    const nodes = pages.flatMap((p) => jsonLdNodes(readFileSync(join(root, p), "utf8")));
    const home = pages[0] ? parse(readFileSync(join(root, pages[0]), "utf8")) : undefined;
    const business = nodes.find((n) => n.address && BUSINESS.test(typeOf(n) ?? "")) ?? nodes.find((n) => BUSINESS.test(typeOf(n) ?? "")) ?? {};
    const addr = business.address ?? {};
    const hours = (Array.isArray(business.openingHoursSpecification) ? business.openingHoursSpecification : [])
        .map((h) => ({
        days: (Array.isArray(h.dayOfWeek) ? h.dayOfWeek : [h.dayOfWeek]).flatMap((d) => {
            const day = DAYS[String(d).split("/").pop().toLowerCase()];
            return day ? [day] : [];
        }),
        opens: time(h.opens),
        closes: time(h.closes),
    }))
        .filter((h) => h.days.length > 0);
    const faq = nodes
        .filter((n) => typeOf(n) === "FAQPage")
        .flatMap((n) => (Array.isArray(n.mainEntity) ? n.mainEntity : []))
        .map((q) => ({ question: q.name, answer: q.acceptedAnswer?.text }))
        .filter((q) => q.question && q.answer);
    const location = {
        address: {
            street: addr.streetAddress,
            locality: addr.addressLocality,
            region: addr.addressRegion,
            postalCode: addr.postalCode,
            ...(addr.addressCountry ? { country: String(addr.addressCountry).slice(0, 2).toUpperCase() } : {}),
        },
        hours,
    };
    if (business.geo?.latitude !== undefined)
        location.geo = { lat: Number(business.geo.latitude), lng: Number(business.geo.longitude) };
    const description = business.description ?? home?.querySelector('meta[name="description"]')?.getAttribute("content") ?? undefined;
    const canonical = home?.querySelector('link[rel="canonical"]')?.getAttribute("href");
    const sameAs = Array.isArray(business.sameAs) ? business.sameAs : business.sameAs ? [business.sameAs] : [];
    const entity = {
        name: business.name ?? home?.querySelector("title")?.text.split(/[|\-]/)[0]?.trim(),
        ...(typeOf(business) ? { type: typeOf(business) } : {}),
        description,
        url: business.url ?? canonical,
        locations: addr.streetAddress ? [location] : [],
        menus: business.hasMenu ? [{ name: "Menu", url: typeof business.hasMenu === "string" ? business.hasMenu : business.hasMenu.url }] : [],
        faq,
        sameAs,
    };
    for (const key of ["legalName", "email", "telephone"])
        if (business[key])
            entity[key] = business[key];
    const missing = [
        ...["legalName", "email", "telephone", "description", "url"].filter((k) => !entity[k]),
        ...(addr.streetAddress ? [] : ["address"]),
        ...(location.geo ? [] : ["geo"]),
        ...(hours.length ? [] : ["hours"]),
        ...(faq.length ? [] : ["faq"]),
        ...(sameAs.length ? [] : ["sameAs"]),
        ...(entity.menus.length ? [] : ["menus"]),
    ];
    return { entity: entity, missing, pages };
}
//# sourceMappingURL=extract.js.map