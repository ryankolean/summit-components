# Site templates

Two starting points for new client sites. Both render the same components from
the same package versions, and CI proves it (`pnpm templates:verify`).

| Template | Pick it when | Output |
|---|---|---|
| `templates/astro-site` | Content sites: menus, hours, events, galleries | Static HTML in `dist/` |
| `templates/next-site` | The site needs auth, data or server actions | Server build, or static HTML in `out/` with `STATIC_EXPORT=1` |

See [STACK_DECISION.md](STACK_DECISION.md) for the rule.

## What every template does

- All content comes from `site/*.json`, validated at build time:
  `brand.json` (tokens), `entity.json` (public facts only), `home.json` (page copy
  and component config). A bad edit fails the build.
- Brand tokens are inlined as CSS variables; components style only against them.
- JSON-LD (business + FAQPage), `robots.txt` and `llms.txt` are generated from
  `entity.json` by `@summit/seo`, so they cannot disagree with the page.
- `SITE_MODE` controls indexing. It defaults to **preview**: `noindex` on every
  page and `Disallow: /`. Only `SITE_MODE=production` opens the site to crawlers.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `SITE_MODE` | `preview` | `production` opens the site to crawlers |
| `SITE_URL` | `entity.url` | Origin for canonicals, OG URLs and the sitemap |
| `BASE_PATH` | `/` | Serve from a sub-path, e.g. a GitHub Pages preview |
| `STATIC_EXPORT` | unset | Next only: `1` writes static HTML to `out/` |

## Starting a client site from a template

Until `summit new` exists (SUMMIT-245):

1. Create the client repo as **private**, then copy the template directory into
   it. Template source is proprietary and never goes into a public repo.
2. Point the `@summit/*` dependencies at release tags, and give the client
   repo's CI read access (see "Private and proprietary" in the README):
   ```bash
   node ~/code/summit-components/scripts/use-tags.mjs <client-repo>
   ```
3. Replace the sample content in `site/*.json` and `public/` (`og.png`,
   `favicon.svg`, images).
4. `pnpm install && pnpm build`, then gate the output:
   ```bash
   node ~/code/summit-components/packages/checks/dist/cli.js gate dist --mode preview
   ```

Next sites exempt their built-in 404 page from the noindex check:
`--allow-noindex /_not-found/`.
