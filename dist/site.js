import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse } from "node-html-parser";
export function normalizeBase(base = "/") {
    let b = base.trim() || "/";
    if (!b.startsWith("/"))
        b = `/${b}`;
    if (!b.endsWith("/"))
        b = `${b}/`;
    return b;
}
function walk(root, ignore) {
    const out = [];
    const visit = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            // Dot directories (.git, .claude worktrees) and node_modules are never published.
            if (entry.name.startsWith(".") || entry.name === "node_modules")
                continue;
            const full = join(dir, entry.name);
            const rel = relative(root, full).split(sep).join("/");
            if (ignore.some((prefix) => rel.startsWith(prefix)))
                continue;
            if (entry.isDirectory())
                visit(full);
            else
                out.push(rel);
        }
    };
    visit(root);
    return out;
}
function urlPathFor(file, base) {
    if (file === "index.html")
        return base;
    if (file.endsWith("/index.html"))
        return base + file.slice(0, -"index.html".length);
    return base + file;
}
/** Loads a built site (or a repo root that is published as-is) from disk. */
export function loadSite(root, options = {}) {
    const base = normalizeBase(options.base);
    const files = walk(root, options.ignore ?? []);
    const pages = files
        .filter((f) => f.endsWith(".html"))
        .map((file) => {
        const doc = parse(readFileSync(join(root, file), "utf8"));
        const robots = doc
            .querySelectorAll('meta[name="robots"], meta[name="googlebot"]')
            .map((m) => (m.getAttribute("content") ?? "").toLowerCase());
        return {
            file,
            urlPath: urlPathFor(file, base),
            root: doc,
            noindex: robots.some((c) => c.includes("noindex")),
            is404: file === "404.html" || file === "404/index.html",
        };
    });
    return {
        root,
        base,
        pages,
        files: new Set(files),
        readText: (file) => (files.includes(file) ? readFileSync(join(root, file), "utf8") : undefined),
    };
}
const SKIP_SCHEMES = /^(?:mailto|tel|sms|javascript|data|blob):/i;
const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
/**
 * Resolves a reference the way the host would. A base must be followed by a
 * separator: "/4pm-detroitbar/x" is not under "/4pm-detroit/".
 */
export function resolveRef(site, fromUrlPath, ref) {
    const href = ref.trim();
    if (!href || href.startsWith("#") || SKIP_SCHEMES.test(href) || ABSOLUTE.test(href)) {
        return { kind: "skip" };
    }
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(href, `http://site.invalid${fromUrlPath}`).pathname);
    }
    catch {
        return { kind: "broken", reason: "unparseable URL" };
    }
    return resolvePath(site, pathname);
}
export function resolvePath(site, pathname) {
    const baseNoSlash = site.base.slice(0, -1);
    let rel;
    if (pathname === baseNoSlash)
        rel = "";
    else if (pathname.startsWith(site.base))
        rel = pathname.slice(site.base.length);
    else
        return { kind: "broken", reason: `outside the site base ${site.base}` };
    const candidates = rel === "" || rel.endsWith("/") ? [`${rel}index.html`] : [rel, `${rel}.html`, `${rel}/index.html`];
    const file = candidates.find((c) => site.files.has(c));
    return file ? { kind: "ok", file } : { kind: "broken", reason: "no such file" };
}
//# sourceMappingURL=site.js.map