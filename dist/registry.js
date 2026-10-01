import { z } from "zod";
export const STACKS = ["astro", "next", "vite", "static-html", "nobuild-react"];
export const Stack = z.enum(STACKS);
/** Stacks that can run a build and import a package. */
const FRAMEWORK_STACKS = ["astro", "next", "vite"];
export const RegistryEntry = z
    .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, "lowercase kebab-case"),
    package: z.string().regex(/^@summit\/[a-z0-9-]+$/, "must be an @summit/ package"),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "semver"),
    description: z.string().min(1),
    kind: z.enum(["component", "add-on", "tooling"]),
    stacks: z.array(Stack).min(1),
    entrypoints: z.object({
        react: z.string().optional(),
        html: z.string().optional(),
        embed: z.string().optional(),
        css: z.string().optional(),
        cli: z.string().optional(),
    }),
    /** Name of the exported config schema, e.g. HeroConfigSchema. */
    configSchema: z.string().optional(),
    /** Path to a runnable example, relative to the repo root. */
    example: z.string().optional(),
    dependsOn: z.array(z.string()).default([]),
    /** Relative build effort, feeds the estimate generator (SUMMIT-247). */
    effort: z.enum(["xs", "s", "m", "l", "xl"]).optional(),
})
    .superRefine((entry, ctx) => {
    const { react, html, embed } = entry.entrypoints;
    for (const stack of entry.stacks) {
        const framework = FRAMEWORK_STACKS.includes(stack);
        if (framework && !react && !html) {
            ctx.addIssue({
                code: "custom",
                path: ["entrypoints"],
                message: `stack "${stack}" needs a react or html entrypoint`,
            });
        }
        if (!framework && !html && !embed) {
            ctx.addIssue({
                code: "custom",
                path: ["entrypoints"],
                message: `stack "${stack}" has no build step and needs an html or embed entrypoint`,
            });
        }
    }
});
export const RegistrySchema = z
    .object({
    schemaVersion: z.literal(1),
    components: z.array(RegistryEntry),
})
    .superRefine((registry, ctx) => {
    const seen = new Set();
    registry.components.forEach((entry, index) => {
        if (seen.has(entry.name)) {
            ctx.addIssue({
                code: "custom",
                path: ["components", index, "name"],
                message: `duplicate component name "${entry.name}"`,
            });
        }
        seen.add(entry.name);
    });
});
//# sourceMappingURL=registry.js.map