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

## Open decisions

- **Where packages publish.** Not wired yet. GitHub Packages requires the npm
  scope to match the owner (`@ryankolean/...`), so keeping `@summit/*` means
  either a `summit` GitHub or npm organization, or installing from git tags.
  Until then, sites consume packages from this workspace.
- **Site templates** (`astro-site-template`, `next-site-template`) and `monitor`
  mode for the checks are the next SUMMIT-244 PR.
