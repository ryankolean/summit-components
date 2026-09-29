import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSite, runChecks, type RunOptions } from "@summit/checks";

const head = (path: string, extra = "") => `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page ${path}</title><meta name="description" content="About ${path}">
<link rel="canonical" href="https://demo.example${path}">
<meta property="og:title" content="Demo"><meta property="og:image" content="https://demo.example/og.png">
<meta name="twitter:card" content="summary_large_image">${extra}</head>`;

const GOOD: Record<string, string> = {
  "index.html": `${head("/")}<body><h1>Home</h1>
    <a href="/about">About</a> <a href="menu/">Menu</a> <a href="https://elsewhere.example/">x</a>
    <a href="mailto:hi@demo.example">mail</a> <a href="#top">top</a>
    <img src="/img/a.jpg" alt="Room" width="10" height="10">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Restaurant","name":"Demo"}</script>
    </body></html>`,
  "about.html": `${head("/about")}<body><h1>About</h1><a href="./">Home</a></body></html>`,
  "menu/index.html": `${head("/menu/")}<body><h1>Menu</h1><a href="../about.html">About</a></body></html>`,
  "404.html": `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><title>Not found</title></head><body><p>Nope</p></body></html>`,
  "img/a.jpg": "binary",
  "robots.txt": "User-agent: *\nAllow: /\nSitemap: https://demo.example/sitemap.xml\n",
  "sitemap.xml": `<?xml version="1.0"?><urlset><url><loc>https://demo.example/</loc></url><url><loc>https://demo.example/about</loc></url><url><loc>https://demo.example/menu/</loc></url></urlset>`,
  "llms.txt": "# Demo\n",
};

function site(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "summit-checks-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
}

function run(files: Record<string, string>, options: RunOptions = {}) {
  return runChecks(loadSite(site(files), options), options);
}

const errorsFor = (report: ReturnType<typeof run>, check: string) =>
  report.findings.filter((f) => f.check === check && f.severity === "error");

describe("a clean site", () => {
  it("has no errors and no warnings", () => {
    const report = run(GOOD);
    expect(report.findings).toEqual([]);
    expect(report.pageCount).toBe(4);
  });

  it("skips dot directories such as .claude worktrees", () => {
    const report = run({ ...GOOD, ".claude/worktrees/x/index.html": "<html><body>junk</body></html>" });
    expect(report.pageCount).toBe(4);
  });
});

describe("internal-links", () => {
  it("reports a link to a missing page", () => {
    const report = run({ ...GOOD, "about.html": GOOD["about.html"]!.replace("./", "/gone") });
    expect(errorsFor(report, "internal-links")).toHaveLength(1);
  });

  it("reports a base-path link that is missing its separator (the 4PM bug)", () => {
    const files: Record<string, string> = {
      ...GOOD,
      "index.html": GOOD["index.html"]!
        .replace('href="/about"', 'href="/sitebar/about"')
        .replace('src="/img/a.jpg"', 'src="/site/img/a.jpg"'),
      "about.html": GOOD["about.html"]!.replace('href="./"', 'href="/site/"'),
      "menu/index.html": GOOD["menu/index.html"]!.replace('href="../about.html"', 'href="/site/about"'),
    };
    const report = run(files, { base: "/site/" });
    const broken = errorsFor(report, "internal-links");
    expect(broken.map((f) => f.message).join()).toContain("/sitebar/about");
    expect(broken).toHaveLength(1);
  });

  it("reports a missing image", () => {
    const { "img/a.jpg": _image, ...withoutImage } = GOOD;
    expect(errorsFor(run(withoutImage), "internal-links")).toHaveLength(1);
  });
});

describe("indexing", () => {
  it("fails production when a page is noindex", () => {
    const files = { ...GOOD, "about.html": GOOD["about.html"]!.replace("</head>", '<meta name="robots" content="noindex, nofollow"></head>') };
    expect(errorsFor(run(files), "indexing")).toHaveLength(1);
  });

  it("allows noindex on pages the caller exempts", () => {
    const files = { ...GOOD, "about.html": GOOD["about.html"]!.replace("</head>", '<meta name="robots" content="noindex"></head>') };
    expect(errorsFor(run(files, { allowNoindex: ["/about.html"] }), "indexing")).toHaveLength(0);
  });

  it("fails production when robots.txt blocks everything (the Meantime trap)", () => {
    const files = { ...GOOD, "robots.txt": "User-agent: *\nDisallow: /\n" };
    expect(errorsFor(run(files), "robots-txt")).toHaveLength(1);
  });

  it("fails preview when the site is open to crawlers", () => {
    expect(errorsFor(run(GOOD, { mode: "preview" }), "indexing")).toHaveLength(1);
  });

  it("passes preview when robots.txt blocks everything", () => {
    const files = { ...GOOD, "robots.txt": "User-agent: *\nDisallow: /\n" };
    const report = run(files, { mode: "preview" });
    expect(errorsFor(report, "indexing")).toHaveLength(0);
    expect(errorsFor(report, "robots-txt")).toHaveLength(0);
  });
});

describe("page checks", () => {
  it("rejects invalid JSON-LD", () => {
    const files = { ...GOOD, "index.html": GOOD["index.html"]!.replace('"name":"Demo"}', '"name":"Demo",}') };
    expect(errorsFor(run(files), "json-ld")).toHaveLength(1);
  });

  it("rejects an image with no alt attribute", () => {
    const files = { ...GOOD, "index.html": GOOD["index.html"]!.replace(' alt="Room"', "") };
    expect(errorsFor(run(files), "images")).toHaveLength(1);
  });

  it("accepts an empty alt for decorative images", () => {
    const files = { ...GOOD, "index.html": GOOD["index.html"]!.replace(' alt="Room"', ' alt=""') };
    expect(errorsFor(run(files), "images")).toHaveLength(0);
  });

  it("warns on a page with two h1 elements", () => {
    const files = { ...GOOD, "about.html": GOOD["about.html"]!.replace("<h1>About</h1>", "<h1>A</h1><h1>B</h1>") };
    expect(run(files).findings.filter((f) => f.check === "headings")).toHaveLength(1);
  });

  it("requires lang and viewport", () => {
    const files = { ...GOOD, "about.html": "<html><head><title>x</title></head><body><h1>x</h1></body></html>" };
    const report = run(files);
    expect(errorsFor(report, "document")).toHaveLength(2);
  });
});

describe("sitemap", () => {
  it("errors on a sitemap URL with no page behind it", () => {
    const files = { ...GOOD, "sitemap.xml": GOOD["sitemap.xml"]!.replace("/about<", "/gone<") };
    expect(errorsFor(run(files), "sitemap")).toHaveLength(1);
  });

  it("warns on an indexable page missing from the sitemap", () => {
    const files = { ...GOOD, "sitemap.xml": GOOD["sitemap.xml"]!.replace("<url><loc>https://demo.example/about</loc></url>", "") };
    const report = run(files);
    expect(report.findings.filter((f) => f.check === "sitemap" && f.severity === "warn")).toHaveLength(1);
  });

  it("reads sitemap indexes such as Astro's sitemap-index.xml", () => {
    const { "sitemap.xml": urls, ...rest } = GOOD;
    const files = {
      ...rest,
      "sitemap-index.xml": `<sitemapindex><sitemap><loc>https://demo.example/sitemap-0.xml</loc></sitemap></sitemapindex>`,
      "sitemap-0.xml": urls!,
    };
    expect(run(files).findings.filter((f) => f.check === "sitemap")).toEqual([]);
  });
});

describe("summary", () => {
  it("counts errors so gate mode can fail", () => {
    const files = { ...GOOD, "robots.txt": "User-agent: *\nDisallow: /\n" };
    const report = run(files);
    expect(report.errorCount).toBeGreaterThan(0);
    expect(report.checks.find((c) => c.id === "robots-txt")?.status).toBe("fail");
  });
});
