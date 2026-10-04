# summit-components

Versioned components, brand tokens, content schemas and site checks for the
Summit website framework (Jira epic SUMMIT-243, this repo is SUMMIT-244).

It serves new client sites and sites Summit built before the framework existed.
Nothing here assumes one stack or requires a site to come from a template.

## Packages

| Package | What it is |
|---|---|
| `@summit/schemas` | Zod schemas: `BrandSchema`, `EntitySchema` (public business facts), `RegistrySchema` |
| `@summit/tokens` | `brand.json` to CSS custom properties and a Tailwind preset, with a WCAG contrast guard. CLI: `summit-tokens` |
| `@summit/hero` | The first component. One package, three renderings with identical markup: React (`@summit/hero`), HTML string (`@summit/hero/html`), custom element (`@summit/hero/embed`), plus `hero.css` |
| `@summit/checks` | Checks that run against built HTML, so they work on any stack. CLI: `summit-checks audit|gate <dir>` |
| `@summit/seo` | JSON-LD, FAQPage, `llms.txt` and `robots.txt` generated from `entity.json` |
| `@summit/cli` | The `summit` command: `intake`, `new`, `preview`, `verify-split`, `check`, `decide`. See [docs/INTAKE.md](docs/INTAKE.md) and [docs/DECISIONS.md](docs/DECISIONS.md) |

Site templates live in `templates/` (Astro and Next). See [docs/TEMPLATES.md](docs/TEMPLATES.md).

`registry.json` lists the components a site can pick, which stacks each one
supports, and its entrypoints. `pnpm registry:check` validates it against the
packages.

## How a component reaches every stack

| Stack | Uses |
|---|---|
| Astro, Next, Vite | the React component, server-rendered with no client JS |
| Static HTML | `renderHero()` output pasted into the page, plus `hero.css` |
| No-build React (Fly Trap) | the same pasted HTML, or `<summit-hero>` from the embed |

Pasted HTML is the preferred path for no-build sites: the content is in the page
for crawlers and answer engines. The custom element leaves pasted content alone
and only renders from `data-config` when a page cannot hold pasted markup.

## Commands

```bash
pnpm install
pnpm test             # vitest, runs against src through the "source" export condition
pnpm typecheck
pnpm build            # tsc per package, in dependency order
pnpm registry:check   # after build
pnpm example          # regenerate packages/hero/example (CI fails on drift)
pnpm templates:verify # build both templates in both modes, gate them, check hero parity
pnpm changeset        # describe a change to one or more packages
pnpm version-packages # apply changesets and sync registry.json
```

Run the checks against any built site:

```bash
node packages/checks/dist/cli.js audit ../some-site/dist
node packages/checks/dist/cli.js gate ../some-site/dist --allow-noindex /styleguide/
node packages/checks/dist/cli.js audit ../umbo            # a repo root published as-is
```

## Docs

- [Stack decision rule](docs/STACK_DECISION.md)
- [Adding a component](docs/ADDING_A_COMPONENT.md)
- [Adding a stack](docs/ADDING_A_STACK.md)
- [Adding a check](docs/ADDING_A_CHECK.md)

## Distribution: git tags

There is no registry. On every merge to `main`, the `release` workflow tags each
package version that has no tag yet, as `<name>-v<version>` (`hero-v0.1.0`).
Each tag is a standalone commit holding just that package, built, at its root,
with its `@summit/*` dependencies pointing at their own tags. Sites install:

```json
"@summit/hero": "github:ryankolean/summit-components#hero-v0.1.0"
```

`node scripts/use-tags.mjs <site-dir>` rewrites a site's `@summit/*`
dependencies to the current tags. To release, run `pnpm version-packages` in a
PR; merging it tags the new versions.

## Developed in the open

This repo is public (decided 2026-10-01), so any site, public or private,
installs from release tags with no token or deploy key. Static and no-build
sites paste HTML and CSS and install nothing.

Being public changes what may be committed here. Client data never goes in
this repo: no private intake, pricing, contacts or credentials, and only
sample content (`example.com`) in the templates.

## Open decisions

- **`monitor` mode** for the checks is part of SUMMIT-252.
