import { describe, expect, it } from "vitest";
import { SiteConfigSchema } from "@summit/schemas";

const config = {
  schemaVersion: 1,
  client: "shellfish-bar",
  mode: "new",
  stack: { name: "astro", reason: "content site" },
  host: { name: "cloudflare-pages", reason: "redirects and headers" },
  pages: [
    {
      path: "/",
      title: "Home",
      source: "new",
      sections: [{ kind: "component", id: "hero", component: "hero", version: "0.2.0", config: { title: "Hi" } }],
    },
  ],
};

describe("SiteConfigSchema", () => {
  it("accepts a minimal config and fills defaults", () => {
    const parsed = SiteConfigSchema.parse(config);
    expect(parsed.redirects).toEqual([]);
    expect(parsed.securityHeaders).toBe(true);
    expect(parsed.pages[0]!.sections[0]).toMatchObject({ status: "new" });
  });

  it("accepts existing elements kept as they are", () => {
    const existing = {
      ...config,
      mode: "existing",
      pages: [{ path: "/menu.html", title: "Menu", source: "existing", sections: [{ kind: "existing", id: "menu-body", description: "Hand-built menu" }] }],
    };
    expect(SiteConfigSchema.parse(existing).pages[0]!.sections[0]).toMatchObject({ decision: "keep" });
  });

  it("rejects a stack outside the registry's list", () => {
    expect(SiteConfigSchema.safeParse({ ...config, stack: { name: "wordpress", reason: "x" } }).success).toBe(false);
  });

  it("requires a reason for the stack and the host", () => {
    expect(SiteConfigSchema.safeParse({ ...config, host: { name: "github-pages", reason: "" } }).success).toBe(false);
  });

  it("rejects duplicate page paths and duplicate section ids on a page", () => {
    const page = config.pages[0]!;
    expect(SiteConfigSchema.safeParse({ ...config, pages: [page, page] }).success).toBe(false);
    const twice = { ...page, sections: [page.sections[0], page.sections[0]] };
    expect(SiteConfigSchema.safeParse({ ...config, pages: [twice] }).success).toBe(false);
  });

  it("requires redirect sources to be paths", () => {
    expect(SiteConfigSchema.safeParse({ ...config, redirects: [{ from: "old.html", to: "/" }] }).success).toBe(false);
  });
});
