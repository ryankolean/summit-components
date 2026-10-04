import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { BrandSchema, EntitySchema } from "@summit/schemas";
import { formatHours } from "@summit/seo";
import { checkContrast, contrastRatio } from "@summit/tokens";
import { extractBrand, extractEntity } from "./extract.js";
/**
 * First line of every private intake document. `summit verify-split` fails any
 * site repo that contains it, so a private doc cannot be committed by accident.
 */
export const PRIVATE_MARKER = "<!-- summit:private intake. Never commit this file to a site repo. -->";
const ASK = "_Unknown. Ask the owner._";
function issues(result, file) {
    return result.success ? [] : result.error.issues.map((i) => `${file} ${i.path.map(String).join(".") || "(root)"}: ${i.message}`);
}
function writeJson(dir, name, data, valid) {
    writeFileSync(join(dir, valid ? `${name}.json` : `${name}.draft.json`), `${JSON.stringify(data, null, 2)}\n`);
}
/**
 * Existing-repo intake: measure what a site already publishes. Public facts go
 * to <out>/site/ (copied into the site repo later); everything else is a
 * private document at <out>/ with PRIVATE_MARKER on its first line.
 */
export function runIntake(options) {
    const site = resolve(options.site);
    const { entity, missing, pages } = extractEntity(site);
    const name = options.name ?? entity.name ?? basename(site);
    if (!entity.name)
        entity.name = name;
    const { brand, roles, palette } = extractBrand(site, name);
    const entityResult = EntitySchema.safeParse(entity);
    const brandResult = BrandSchema.safeParse(brand);
    const errors = [...issues(entityResult, "entity.json"), ...issues(brandResult, "brand.json")];
    const siteDir = join(options.out, "site");
    mkdirSync(siteDir, { recursive: true });
    writeJson(siteDir, "entity", entityResult.success ? entityResult.data : entity, entityResult.success);
    writeJson(siteDir, "brand", brandResult.success ? brandResult.data : brand, brandResult.success);
    const parsedBrand = brandResult.success ? brandResult.data : undefined;
    const parsedEntity = entityResult.success ? entityResult.data : undefined;
    writeFileSync(join(options.out, "intake-report.md"), report({ site, pages, roles, palette, missing, errors, brand: parsedBrand }));
    writeFileSync(join(options.out, "entity-profile.md"), entityProfile(name, parsedEntity, missing));
    writeFileSync(join(options.out, "style-guide.md"), styleGuide(name, parsedBrand, roles));
    return { entityValid: entityResult.success, brandValid: brandResult.success, errors, missing, roles };
}
function report(args) {
    const lines = [
        PRIVATE_MARKER,
        "",
        "# Intake report",
        "",
        `Source: \`${args.site}\` (${args.pages.length} pages: ${args.pages.join(", ") || "none"})`,
        "",
        "## Brand roles",
        "",
        "| role | value | source | evidence |",
        "|---|---|---|---|",
        ...Object.entries(args.roles).map(([role, r]) => `| ${role} | ${r.value} | ${r.source} | ${r.measured ? "measured" : "inferred"} |`),
        "",
        `Palette declared in :root: ${args.palette.join(", ") || "none"}`,
        "",
        "## Contrast",
        "",
    ];
    const contrast = args.brand ? checkContrast(args.brand) : [];
    if (!args.brand)
        lines.push("Brand is not valid yet; contrast not checked.");
    else if (!contrast.length)
        lines.push("All text pairs meet WCAG AA.");
    else
        for (const c of contrast)
            lines.push(`- ${c.level}: ${c.pair} is ${c.ratio}:1, needs ${c.min}:1 (${c.note})`);
    lines.push("", "## Business facts the site does not publish", "");
    lines.push(...(args.missing.length ? args.missing.map((m) => `- ${m}`) : ["- none"]));
    lines.push("", "## Validation", "");
    lines.push(...(args.errors.length ? args.errors.map((e) => `- ${e}`) : ["- entity.json and brand.json are valid."]));
    return `${lines.join("\n")}\n`;
}
function entityProfile(name, entity, missing) {
    const loc = entity?.locations[0];
    const known = (value) => value ?? ASK;
    return `${PRIVATE_MARKER}

# ${name}: entity profile

Measured facts come from the public site; everything marked unknown is an owner
question. Public facts belong in \`site/entity.json\`; this file is private.

## Business

- Name: ${name}
- Type: ${known(entity?.type)}
- Description: ${known(entity?.description)}
- Website: ${known(entity?.url)}
- Phone: ${known(entity?.telephone)}
- Email: ${known(entity?.email)}
- Legal entity: ${known(entity?.legalName)}

## Locations and hours

${loc ? `- ${loc.address.street}, ${loc.address.locality}, ${loc.address.region} ${loc.address.postalCode}\n- Hours: ${formatHours(loc.hours) || ASK}` : ASK}

## Offerings

${entity?.menus.length ? entity.menus.map((m) => `- ${m.name}${m.url ? `: ${m.url}` : ""}`).join("\n") : ASK}

## Team

${ASK}

## Audience

${ASK}

## Competitors

${ASK}

## Current tech stack, domains, hosting, registrar

${ASK}

## DNS and mail provider

${ASK} Capture the full zone before anything moves.

## Socials and listings (GBP, Apple, Yelp)

${entity?.sameAs.length ? entity.sameAs.map((s) => `- ${s}`).join("\n") : ASK}

## Reviews

${ASK}

## Pain points

${ASK}

## Goals

${ASK}

## Not published on the site

${missing.map((m) => `- ${m}`).join("\n") || "- none"}
`;
}
function styleGuide(name, brand, roles) {
    const palette = brand
        ? Object.entries(brand.colors)
            .map(([role, hex]) => {
            const r = roles[role];
            const ratio = contrastRatio(hex, brand.colors.bg).toFixed(2);
            return `| ${role} | ${hex} | ${ratio}:1 | ${r ? `${r.measured ? "measured" : "inferred"} from ${r.source}` : "extra"} |`;
        })
            .join("\n")
        : "";
    return `${PRIVATE_MARKER}

# ${name}: brand style guide

## Logo

${ASK} Collect source files (SVG or high-resolution PNG), not screenshots.

## Palette

${brand ? `| role | hex | contrast on bg | evidence |\n|---|---|---|---|\n${palette}` : ASK}

## Typography

${brand ? `- Display: ${brand.fonts.display.family} (fallback ${brand.fonts.display.fallback})\n- Body: ${brand.fonts.body.family} (fallback ${brand.fonts.body.fallback})` : ASK}

## Font licences

${ASK} Confirm every family is licensed for web use before it ships.

## Voice and tone

${ASK}

## Imagery style

${ASK}

## Existing assets

${ASK}
`;
}
//# sourceMappingURL=intake.js.map