export const PREFIX = "--summit";
const kebab = (key) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
function channels(hex) {
    let h = hex.slice(1);
    if (h.length === 3)
        h = [...h].map((c) => c + c).join("");
    const n = Number.parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance(hex) {
    const [r, g, b] = channels(hex).map((v) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG 2.x contrast ratio between two hex colors, 1 to 21. */
export function contrastRatio(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}
/**
 * Checks the pairs components actually render. Every text role must meet WCAG
 * AA (4.5:1), including primary, which outline buttons and links use as text.
 * The accent only warns, because many brands use it as a ground and never as text.
 */
export function checkContrast(brand) {
    const c = brand.colors;
    const rules = [
        ["fg on bg", c.fg, c.bg, 4.5, "error", "body text"],
        ["muted on bg", c.muted, c.bg, 4.5, "error", "secondary text"],
        ["onPrimary on primary", c.onPrimary, c.primary, 4.5, "error", "button labels"],
        ["primary on bg", c.primary, c.bg, 4.5, "error", "links and outline button labels"],
        ["accent on bg", c.accent, c.bg, 3, "warn", "use the accent as a ground, not as text"],
    ];
    const issues = [];
    for (const [pair, fg, bg, min, level, note] of rules) {
        const ratio = contrastRatio(fg, bg);
        if (ratio < min)
            issues.push({ pair, ratio: Math.round(ratio * 100) / 100, min, level, note });
    }
    return issues;
}
const fontValue = (font) => `"${font.family}", ${font.fallback}`;
/** Brand tokens as CSS custom properties, the contract every component styles against. */
export function toCssVariables(brand, options = {}) {
    const lines = Object.entries(brand.colors).map(([key, value]) => `  ${PREFIX}-color-${kebab(key)}: ${value};`);
    lines.push(`  ${PREFIX}-font-display: ${fontValue(brand.fonts.display)};`);
    lines.push(`  ${PREFIX}-font-body: ${fontValue(brand.fonts.body)};`);
    lines.push(`  ${PREFIX}-radius: ${brand.radius};`);
    return `${options.selector ?? ":root"} {\n${lines.join("\n")}\n}\n`;
}
/** Tailwind preset that points utilities at the CSS variables, so one stylesheet rebrands both. */
export function tailwindPreset(brand) {
    const colors = {};
    for (const key of Object.keys(brand.colors)) {
        colors[kebab(key)] = `var(${PREFIX}-color-${kebab(key)})`;
    }
    return {
        theme: {
            extend: {
                colors,
                fontFamily: {
                    display: [`var(${PREFIX}-font-display)`],
                    body: [`var(${PREFIX}-font-body)`],
                },
                borderRadius: { brand: `var(${PREFIX}-radius)` },
            },
        },
    };
}
//# sourceMappingURL=index.js.map