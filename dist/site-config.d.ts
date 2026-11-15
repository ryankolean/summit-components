import { z } from "zod";
/** A registry component placed on a page, pinned to a version, with its config. */
export declare const ComponentSection: z.ZodObject<{
    kind: z.ZodLiteral<"component">;
    id: z.ZodString;
    component: z.ZodString;
    version: z.ZodString;
    config: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    status: z.ZodDefault<z.ZodEnum<{
        new: "new";
        adopt: "adopt";
    }>>;
}, z.core.$strip>;
/** An element an existing site already has and keeps (the default for existing repos). */
export declare const ExistingSection: z.ZodObject<{
    kind: z.ZodLiteral<"existing">;
    id: z.ZodString;
    description: z.ZodString;
    decision: z.ZodDefault<z.ZodEnum<{
        keep: "keep";
        "replace-later": "replace-later";
    }>>;
}, z.core.$strip>;
export declare const Section: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"component">;
    id: z.ZodString;
    component: z.ZodString;
    version: z.ZodString;
    config: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    status: z.ZodDefault<z.ZodEnum<{
        new: "new";
        adopt: "adopt";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"existing">;
    id: z.ZodString;
    description: z.ZodString;
    decision: z.ZodDefault<z.ZodEnum<{
        keep: "keep";
        "replace-later": "replace-later";
    }>>;
}, z.core.$strip>], "kind">;
export declare const PagePlan: z.ZodObject<{
    path: z.ZodString;
    title: z.ZodString;
    purpose: z.ZodOptional<z.ZodString>;
    source: z.ZodEnum<{
        new: "new";
        existing: "existing";
    }>;
    sections: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"component">;
        id: z.ZodString;
        component: z.ZodString;
        version: z.ZodString;
        config: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        status: z.ZodDefault<z.ZodEnum<{
            new: "new";
            adopt: "adopt";
        }>>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"existing">;
        id: z.ZodString;
        description: z.ZodString;
        decision: z.ZodDefault<z.ZodEnum<{
            keep: "keep";
            "replace-later": "replace-later";
        }>>;
    }, z.core.$strip>], "kind">>;
}, z.core.$strip>;
export declare const Hosts: readonly ["github-pages", "cloudflare-pages", "vercel", "netlify", "other"];
/**
 * The Decisions stage output (SUMMIT-246): what the Build stage consumes.
 * Every choice carries its reason so a later reader knows why, not just what.
 */
export declare const SiteConfigSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    client: z.ZodString;
    mode: z.ZodEnum<{
        new: "new";
        existing: "existing";
    }>;
    stack: z.ZodObject<{
        name: z.ZodEnum<{
            astro: "astro";
            next: "next";
            vite: "vite";
            "static-html": "static-html";
            "nobuild-react": "nobuild-react";
        }>;
        reason: z.ZodString;
        replatform: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
    host: z.ZodObject<{
        name: z.ZodEnum<{
            "github-pages": "github-pages";
            "cloudflare-pages": "cloudflare-pages";
            vercel: "vercel";
            netlify: "netlify";
            other: "other";
        }>;
        reason: z.ZodString;
    }, z.core.$strip>;
    liveUrl: z.ZodOptional<z.ZodURL>;
    pages: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        title: z.ZodString;
        purpose: z.ZodOptional<z.ZodString>;
        source: z.ZodEnum<{
            new: "new";
            existing: "existing";
        }>;
        sections: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"component">;
            id: z.ZodString;
            component: z.ZodString;
            version: z.ZodString;
            config: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            status: z.ZodDefault<z.ZodEnum<{
                new: "new";
                adopt: "adopt";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"existing">;
            id: z.ZodString;
            description: z.ZodString;
            decision: z.ZodDefault<z.ZodEnum<{
                keep: "keep";
                "replace-later": "replace-later";
            }>>;
        }, z.core.$strip>], "kind">>;
    }, z.core.$strip>>;
    redirects: z.ZodDefault<z.ZodArray<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        status: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<301>, z.ZodLiteral<302>]>>;
    }, z.core.$strip>>>;
    securityHeaders: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type SiteConfigInput = z.input<typeof SiteConfigSchema>;
export type SiteConfig = z.output<typeof SiteConfigSchema>;
