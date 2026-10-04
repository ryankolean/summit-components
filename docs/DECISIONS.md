# Decisions (Stage 2)

Decisions turn intake into a plan the Build stage runs without follow-up
questions. The output is three files in the client repo's `decisions/` folder:

| File | For | Written by |
|---|---|---|
| `site.config.json` | Build (machine-readable): stack, host, pages, components with pinned versions and config | `summit decide init`, then edited |
| `design-doc.md` | People: every decision with its reason, page and component tables, visual direction | `summit decide docs` |
| `implementation-doc.md` | Build: one entry per planned PR, in order | `summit decide docs` |

For an existing site whose repo root is published as-is (Umbo, Meantime), keep
`decisions/` in the private intake repo instead (`summit-intake/<client>/decisions/`)
until adoption (SUMMIT-253) gives the site a folder that is not served.

## Workflow

```bash
# new site: stack and host from the rules in STACK_DECISION.md
summit decide init . --client <repo-name> --out decisions/site.config.json

# existing site: one "existing, keep" section per page; current stack and host kept
summit decide init ~/code/summit-intake/<client> --client <client> --existing ~/<site-repo> \
  --out ~/code/summit-intake/<client>/decisions/site.config.json

# record needs that change the rules
summit decide init . --client <name> --needs auth,legacyRedirects --out decisions/site.config.json

# edit site.config.json, then
summit decide validate decisions/site.config.json
summit decide docs decisions/site.config.json --out decisions --brand site/brand.json
```

Client CI runs `summit decide validate` whenever `decisions/site.config.json` exists.

## What validate enforces

Errors block Build:

- the schema: kebab-case ids, unique page paths and section ids, a reason for
  the stack and the host
- every component exists in the registry, supports the chosen stack, and is
  pinned to a released version
- every component's config passes its config schema
- no redirects on GitHub Pages, which cannot serve 301s

Warnings are decisions worth a second look:

- a pinned version older than the current release
- security headers on GitHub Pages, which cannot send them
- Next on GitHub Pages (static export only)
- a new site on `static-html` or `nobuild-react` instead of Astro
- a component with no registered config schema

## Sections

Each page is a list of sections, in page order:

- `{"kind": "component", "component": "hero", "version": "0.2.0", "config": {...}, "status": "new" | "adopt"}`.
  `adopt` replaces an element an existing site already has.
- `{"kind": "existing", "description": "...", "decision": "keep" | "replace-later"}`.
  Existing elements are kept by default. `replace-later` lists them for a
  future plan without scheduling a PR.
