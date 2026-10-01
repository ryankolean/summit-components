import { z } from "zod";
export declare const STACKS: readonly ["astro", "next", "vite", "static-html", "nobuild-react"];
export declare const Stack: z.ZodEnum<{
    astro: "astro";
    next: "next";
    vite: "vite";
    "static-html": "static-html";
    "nobuild-react": "nobuild-react";
}>;
export type Stack = z.infer<typeof Stack>;
export declare const RegistryEntry: z.ZodObject<{
    name: z.ZodString;
    package: z.ZodString;
    version: z.ZodString;
    description: z.ZodString;
    kind: z.ZodEnum<{
        component: "component";
        "add-on": "add-on";
        tooling: "tooling";
    }>;
    stacks: z.ZodArray<z.ZodEnum<{
        astro: "astro";
        next: "next";
        vite: "vite";
        "static-html": "static-html";
        "nobuild-react": "nobuild-react";
    }>>;
    entrypoints: z.ZodObject<{
        react: z.ZodOptional<z.ZodString>;
        html: z.ZodOptional<z.ZodString>;
        embed: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        cli: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    configSchema: z.ZodOptional<z.ZodString>;
    example: z.ZodOptional<z.ZodString>;
    dependsOn: z.ZodDefault<z.ZodArray<z.ZodString>>;
    effort: z.ZodOptional<z.ZodEnum<{
        xs: "xs";
        s: "s";
        m: "m";
        l: "l";
        xl: "xl";
    }>>;
}, z.core.$strip>;
export declare const RegistrySchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    components: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        package: z.ZodString;
        version: z.ZodString;
        description: z.ZodString;
        kind: z.ZodEnum<{
            component: "component";
            "add-on": "add-on";
            tooling: "tooling";
        }>;
        stacks: z.ZodArray<z.ZodEnum<{
            astro: "astro";
            next: "next";
            vite: "vite";
            "static-html": "static-html";
            "nobuild-react": "nobuild-react";
        }>>;
        entrypoints: z.ZodObject<{
            react: z.ZodOptional<z.ZodString>;
            html: z.ZodOptional<z.ZodString>;
            embed: z.ZodOptional<z.ZodString>;
            css: z.ZodOptional<z.ZodString>;
            cli: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        configSchema: z.ZodOptional<z.ZodString>;
        example: z.ZodOptional<z.ZodString>;
        dependsOn: z.ZodDefault<z.ZodArray<z.ZodString>>;
        effort: z.ZodOptional<z.ZodEnum<{
            xs: "xs";
            s: "s";
            m: "m";
            l: "l";
            xl: "xl";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type RegistryEntry = z.output<typeof RegistryEntry>;
export type Registry = z.output<typeof RegistrySchema>;
