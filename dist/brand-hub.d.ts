import { z } from "zod";
export declare const BrandHubLogo: z.ZodObject<{
    name: z.ZodString;
    file: z.ZodString;
    on: z.ZodDefault<z.ZodString>;
    usage: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const BrandHubVoiceTrait: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    do: z.ZodOptional<z.ZodString>;
    dont: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const BrandHubCopyExample: z.ZodObject<{
    context: z.ZodString;
    write: z.ZodString;
    avoid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const BrandHubSchema: z.ZodObject<{
    tagline: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodString>;
    logos: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        file: z.ZodString;
        on: z.ZodDefault<z.ZodString>;
        usage: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    logoRules: z.ZodDefault<z.ZodObject<{
        clearSpace: z.ZodOptional<z.ZodString>;
        minSize: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    colorUsage: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    fontStylesheets: z.ZodOptional<z.ZodArray<z.ZodURL>>;
    voice: z.ZodDefault<z.ZodObject<{
        summary: z.ZodOptional<z.ZodString>;
        traits: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            do: z.ZodOptional<z.ZodString>;
            dont: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        examples: z.ZodDefault<z.ZodArray<z.ZodObject<{
            context: z.ZodString;
            write: z.ZodString;
            avoid: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    imagery: z.ZodDefault<z.ZodObject<{
        summary: z.ZodOptional<z.ZodString>;
        keywords: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    rules: z.ZodDefault<z.ZodObject<{
        do: z.ZodDefault<z.ZodArray<z.ZodString>>;
        dont: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    preparedBy: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type BrandHubInput = z.input<typeof BrandHubSchema>;
export type BrandHub = z.output<typeof BrandHubSchema>;
