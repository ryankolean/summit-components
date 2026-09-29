import { z } from "zod";

export const HexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "expected a hex color such as #1A120B");

// Brand values are inlined into a <style> tag, so they are restricted to characters
// that cannot close the tag or break out of a declaration.
export const FontStack = z.object({
  family: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, "letters, digits, spaces and hyphens only"),
  fallback: z
    .string()
    .regex(/^[A-Za-z0-9 ,"'-]+$/, "a comma-separated list of font names")
    .default("system-ui, sans-serif"),
  weights: z.array(z.number().int().min(100).max(900)).optional(),
});

/**
 * Brand tokens for one site. The six named colors are roles, not hues: every
 * component styles itself from roles, so a rebrand never touches component code.
 * Extra keys are allowed for site-specific colors.
 */
export const BrandSchema = z.object({
  name: z.string().min(1),
  colors: z
    .object({
      bg: HexColor,
      fg: HexColor,
      muted: HexColor,
      primary: HexColor,
      onPrimary: HexColor,
      accent: HexColor,
    })
    .catchall(HexColor),
  fonts: z.object({
    display: FontStack,
    body: FontStack,
  }),
  radius: z
    .string()
    .regex(/^(?:0|\d*\.?\d+(?:px|rem|em|%))$/, "a length such as 0, 4px or 0.5rem")
    .default("0"),
});

export type BrandInput = z.input<typeof BrandSchema>;
export type Brand = z.output<typeof BrandSchema>;
