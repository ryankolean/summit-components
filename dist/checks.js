import { resolvePath, resolveRef } from "./site.js";
const indexable = (site) => site.pages.filter((p) => !p.noindex && !p.is404);
const meta = (page, selector) => page.root.querySelector(selector)?.getAttribute("content")?.trim();
function robotsBlocksAll(robots) {
    let appliesToAll = false;
    for (const raw of robots.split(/\r?\n/)) {
        const line = raw.replace(/#.*/, "").trim();
        const [key = "", ...rest] = line.split(":");
        const value = rest.join(":").trim();
        if (/^user-agent$/i.test(key))
            appliesToAll = value === "*";
        else if (appliesToAll && /^disallow$/i.test(key) && value === "/")
            return true;
    }
    return false;
}
export const document = {
    id: "document",
    description: "lang, viewport and title on every page",
    run(site) {
        const out = [];
        for (const page of site.pages) {
            const f = (message) => out.push({ check: "document", severity: "error", page: page.urlPath, message });
            if (!page.root.querySelector("html")?.getAttribute("lang"))
                f("<html> has no lang attribute");
            if (!page.root.querySelector('meta[name="viewport"]'))
                f("no viewport meta tag");
            if (!page.root.querySelector("title")?.text.trim())
                f("no <title>");
        }
        return out;
    },
};
export const metadata = {
    id: "metadata",
    description: "description, canonical and unique titles on indexable pages",
    run(site) {
        const out = [];
        const titles = new Map();
        for (const page of indexable(site)) {
            const f = (severity, message) => out.push({ check: "metadata", severity, page: page.urlPath, message });
            if (!meta(page, 'meta[name="description"]'))
                f("warn", "no meta description");
            const canonical = page.root.querySelector('link[rel="canonical"]')?.getAttribute("href");
            if (!canonical)
                f("warn", "no canonical link");
            else if (!/^https?:\/\//i.test(canonical))
                f("error", `canonical is not absolute: ${canonical}`);
            const title = page.root.querySelector("title")?.text.trim();
            if (title)
                titles.set(title, [...(titles.get(title) ?? []), page.urlPath]);
        }
        for (const [title, paths] of titles) {
            if (paths.length > 1) {
                out.push({ check: "metadata", severity: "warn", message: `title "${title}" is shared by ${paths.join(", ")}` });
            }
        }
        return out;
    },
};
export const headings = {
    id: "headings",
    description: "exactly one h1 per indexable page",
    run(site) {
        return indexable(site).flatMap((page) => {
            const count = page.root.querySelectorAll("h1").length;
            return count === 1
                ? []
                : [{ check: "headings", severity: "warn", page: page.urlPath, message: `${count} h1 elements` }];
        });
    },
};
export const socialCard = {
    id: "social-card",
    description: "Open Graph and Twitter card tags so shared links unfurl",
    run(site) {
        return indexable(site).flatMap((page) => {
            const missing = [
                ['meta[property="og:title"]', "og:title"],
                ['meta[property="og:image"]', "og:image"],
                ['meta[name="twitter:card"]', "twitter:card"],
            ]
                .filter(([selector]) => !meta(page, selector))
                .map(([, name]) => name);
            return missing.length
                ? [{ check: "social-card", severity: "warn", page: page.urlPath, message: `missing ${missing.join(", ")}` }]
                : [];
        });
    },
};
export const jsonLd = {
    id: "json-ld",
    description: "structured data parses and declares a type",
    run(site) {
        const out = [];
        for (const page of site.pages) {
            for (const script of page.root.querySelectorAll('script[type="application/ld+json"]')) {
                let data;
                try {
                    data = JSON.parse(script.rawText);
                }
                catch (error) {
                    out.push({ check: "json-ld", severity: "error", page: page.urlPath, message: `invalid JSON: ${error.message}` });
                    continue;
                }
                const nodes = (Array.isArray(data) ? data : [data]).flatMap((n) => n && typeof n === "object" && "@graph" in n ? n["@graph"] : [n]);
                if (nodes.some((n) => !n || typeof n !== "object" || !("@type" in n))) {
                    out.push({ check: "json-ld", severity: "warn", page: page.urlPath, message: "a JSON-LD node has no @type" });
                }
            }
        }
        return out;
    },
};
export const images = {
    id: "images",
    description: "alt attributes, and dimensions to prevent layout shift",
    run(site) {
        const out = [];
        for (const page of site.pages) {
            for (const img of page.root.querySelectorAll("img")) {
                const src = img.getAttribute("src") ?? "(no src)";
                if (!img.hasAttribute("alt")) {
                    out.push({ check: "images", severity: "error", page: page.urlPath, message: `img has no alt: ${src}` });
                }
                if (!img.hasAttribute("width") || !img.hasAttribute("height")) {
                    out.push({ check: "images", severity: "warn", page: page.urlPath, message: `img has no width/height: ${src}` });
                }
            }
        }
        return out;
    },
};
const REF_SELECTORS = [
    ["a[href]", "href"],
    ["img[src]", "src"],
    ["script[src]", "src"],
    ["source[src]", "src"],
    ['link[rel="stylesheet"][href]', "href"],
    ['link[rel="icon"][href]', "href"],
    ['link[rel="apple-touch-icon"][href]', "href"],
    ['link[rel="manifest"][href]', "href"],
];
export const internalLinks = {
    id: "internal-links",
    description: "every internal href and src resolves to a published file",
    run(site) {
        const out = [];
        for (const page of site.pages) {
            const seen = new Set();
            const refs = REF_SELECTORS.flatMap(([selector, attr]) => page.root.querySelectorAll(selector).map((el) => el.getAttribute(attr) ?? ""));
            for (const el of page.root.querySelectorAll("img[srcset], source[srcset]")) {
                for (const part of (el.getAttribute("srcset") ?? "").split(",")) {
                    const url = part.trim().split(/\s+/)[0];
                    if (url)
                        refs.push(url);
                }
            }
            for (const ref of refs) {
                if (seen.has(ref))
                    continue;
                seen.add(ref);
                const result = resolveRef(site, page.urlPath, ref);
                if (result.kind === "broken") {
                    out.push({ check: "internal-links", severity: "error", page: page.urlPath, message: `${ref} (${result.reason})` });
                }
            }
        }
        return out;
    },
};
export const indexing = {
    id: "indexing",
    description: "noindex matches the mode: open in production, closed in preview",
    run(site, { mode, allowNoindex }) {
        const allowed = (page) => allowNoindex.some((a) => a === page.urlPath || a === page.file || a === `/${page.file}`);
        if (mode === "production") {
            return site.pages
                .filter((p) => p.noindex && !p.is404 && !allowed(p))
                .map((p) => ({ check: "indexing", severity: "error", page: p.urlPath, message: "noindex in a production build" }));
        }
        const robots = site.readText("robots.txt");
        if (robots && robotsBlocksAll(robots))
            return [];
        const open = site.pages.filter((p) => !p.noindex && !p.is404);
        return open.length
            ? [{ check: "indexing", severity: "error", message: `preview is open to crawlers: ${open.length} page(s) without noindex and robots.txt does not block all` }]
            : [];
    },
};
export const robotsTxt = {
    id: "robots-txt",
    description: "robots.txt present, not blocking production, and pointing at the sitemap",
    run(site, { mode }) {
        const robots = site.readText("robots.txt");
        if (mode === "preview")
            return [];
        if (robots === undefined)
            return [{ check: "robots-txt", severity: "warn", message: "no robots.txt" }];
        const out = [];
        if (robotsBlocksAll(robots)) {
            out.push({ check: "robots-txt", severity: "error", message: "robots.txt disallows / for all agents; this deindexes the site" });
        }
        if (!/^\s*sitemap\s*:/im.test(robots)) {
            out.push({ check: "robots-txt", severity: "warn", message: "robots.txt has no Sitemap line" });
        }
        return out;
    },
};
export const sitemap = {
    id: "sitemap",
    description: "sitemap URLs resolve and cover every indexable page",
    run(site) {
        const xmlFiles = [...site.files].filter((f) => /^sitemap[^/]*\.xml$/.test(f));
        if (!xmlFiles.length)
            return [{ check: "sitemap", severity: "warn", message: "no sitemap.xml" }];
        const out = [];
        const covered = new Set();
        for (const file of xmlFiles) {
            const xml = site.readText(file) ?? "";
            for (const [, loc = ""] of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
                let pathname;
                try {
                    pathname = decodeURIComponent(new URL(loc).pathname);
                }
                catch {
                    out.push({ check: "sitemap", severity: "error", message: `${file}: invalid URL ${loc}` });
                    continue;
                }
                if (pathname.endsWith(".xml"))
                    continue; // entry in a sitemap index
                const result = resolvePath(site, pathname);
                if (result.kind === "ok")
                    covered.add(result.file);
                else
                    out.push({ check: "sitemap", severity: "error", message: `${file}: ${loc} has no page (${result.reason})` });
            }
        }
        for (const page of indexable(site)) {
            if (!covered.has(page.file)) {
                out.push({ check: "sitemap", severity: "warn", page: page.urlPath, message: "indexable page is not in the sitemap" });
            }
        }
        return out;
    },
};
export const llmsTxt = {
    id: "llms-txt",
    description: "llms.txt present for answer engines",
    run(site) {
        return site.files.has("llms.txt") ? [] : [{ check: "llms-txt", severity: "warn", message: "no llms.txt" }];
    },
};
export const ALL_CHECKS = [
    document,
    metadata,
    headings,
    socialCard,
    jsonLd,
    images,
    internalLinks,
    indexing,
    robotsTxt,
    sitemap,
    llmsTxt,
];
//# sourceMappingURL=checks.js.map