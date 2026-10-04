import { z } from "zod";
/** Validated config for the hero, used by Decisions (site.config.json) and the registry. */
export declare const HeroConfigSchema: z.ZodObject<{
    id: z.ZodDefault<z.ZodString>;
    headingLevel: z.ZodDefault<z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>]>>;
    eyebrow: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    lede: z.ZodOptional<z.ZodString>;
    primaryCta: z.ZodOptional<z.ZodObject<{
        label: z.ZodString;
        href: z.ZodString;
    }, z.core.$strip>>;
    secondaryCta: z.ZodOptional<z.ZodObject<{
        label: z.ZodString;
        href: z.ZodString;
    }, z.core.$strip>>;
    image: z.ZodOptional<z.ZodObject<{
        src: z.ZodString;
        alt: z.ZodString;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, z.core.$strip>>;
    align: z.ZodDefault<z.ZodEnum<{
        start: "start";
        center: "center";
    }>>;
}, z.core.$strip>;
export type HeroConfig = z.output<typeof HeroConfigSchema>;
