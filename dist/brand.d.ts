import { z } from "zod";
export declare const HexColor: z.ZodString;
export declare const FontStack: z.ZodObject<{
    family: z.ZodString;
    fallback: z.ZodDefault<z.ZodString>;
    weights: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
}, z.core.$strip>;
/**
 * Brand tokens for one site. The six named colors are roles, not hues: every
 * component styles itself from roles, so a rebrand never touches component code.
 * Extra keys are allowed for site-specific colors.
 */
export declare const BrandSchema: z.ZodObject<{
    name: z.ZodString;
    colors: z.ZodObject<{
        bg: z.ZodString;
        fg: z.ZodString;
        muted: z.ZodString;
        primary: z.ZodString;
        onPrimary: z.ZodString;
        accent: z.ZodString;
    }, z.core.$catchall<z.ZodString>>;
    fonts: z.ZodObject<{
        display: z.ZodObject<{
            family: z.ZodString;
            fallback: z.ZodDefault<z.ZodString>;
            weights: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        }, z.core.$strip>;
        body: z.ZodObject<{
            family: z.ZodString;
            fallback: z.ZodDefault<z.ZodString>;
            weights: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    radius: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type BrandInput = z.input<typeof BrandSchema>;
export type Brand = z.output<typeof BrandSchema>;
