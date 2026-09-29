import { z } from "zod";

export const HexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "expected a hex color such as #1A120B");

export const FontStack = z.object({
  family: z.string().min(1),
  fallback: z.string().min(1).default("system-ui, sans-serif"),
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
  radius: z.string().default("0"),
});

export type BrandInput = z.input<typeof BrandSchema>;
export type Brand = z.output<typeof BrandSchema>;
