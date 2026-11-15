import { z } from "zod";
import { Stack } from "./registry.js";
const Id = z.string().regex(/^[a-z][a-z0-9-]*$/, "lowercase kebab-case");
const SemVer = z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "semver");
/** A registry component placed on a page, pinned to a version, with its config. */
export const ComponentSection = z.object({
    kind: z.literal("component"),
    id: Id,
    component: z.string().min(1),
    version: SemVer,
    config: z.record(z.string(), z.unknown()).default({}),
    /** new: built fresh; adopt: replaces an element an existing site already has. */
    status: z.enum(["new", "adopt"]).default("new"),
});
/** An element an existing site already has and keeps (the default for existing repos). */
export const ExistingSection = z.object({
    kind: z.literal("existing"),
    id: Id,
    description: z.string().min(1),
    decision: z.enum(["keep", "replace-later"]).default("keep"),
});
export const Section = z.discriminatedUnion("kind", [ComponentSection, ExistingSection]);
export const PagePlan = z
    .object({
    path: z.string().regex(/^\//, "starts with /"),
    title: z.string().min(1),
    purpose: z.string().optional(),
    source: z.enum(["new", "existing"]),
    sections: z.array(Section).min(1),
})
    .superRefine((page, ctx) => {
    const seen = new Set();
    page.sections.forEach((s, i) => {
        if (seen.has(s.id))
            ctx.addIssue({ code: "custom", path: ["sections", i, "id"], message: `duplicate section id "${s.id}"` });
        seen.add(s.id);
    });
});
export const Hosts = ["github-pages", "cloudflare-pages", "vercel", "netlify", "other"];
/**
 * The Decisions stage output (SUMMIT-246): what the Build stage consumes.
 * Every choice carries its reason so a later reader knows why, not just what.
 */
export const SiteConfigSchema = z
    .object({
    schemaVersion: z.literal(1),
    client: Id,
    mode: z.enum(["new", "existing"]),
    stack: z.object({
        name: Stack,
        reason: z.string().min(1),
        /** Existing repos only: true when Decisions chose to move to a new stack. */
        replatform: z.boolean().default(false),
    }),
    host: z.object({ name: z.enum(Hosts), reason: z.string().min(1) }),
    liveUrl: z.url().optional(),
    pages: z.array(PagePlan).min(1),
    redirects: z
        .array(z.object({
        from: z.string().regex(/^\//, "starts with /"),
        to: z.string().min(1),
        status: z.union([z.literal(301), z.literal(302)]).default(301),
    }))
        .default([]),
    /** Whether the launch should send security headers (SUMMIT-252). */
    securityHeaders: z.boolean().default(true),
})
    .superRefine((config, ctx) => {
    const seen = new Set();
    config.pages.forEach((p, i) => {
        if (seen.has(p.path))
            ctx.addIssue({ code: "custom", path: ["pages", i, "path"], message: `duplicate page "${p.path}"` });
        seen.add(p.path);
    });
});
//# sourceMappingURL=site-config.js.map