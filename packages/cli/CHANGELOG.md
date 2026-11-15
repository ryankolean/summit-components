# @summit/cli

## 0.3.0

### Minor Changes

- 33dbfe8: Add the brand hub: `summit brand-hub <intake-dir>` builds one self-contained,
  interactive page for the client from `site/brand.json` and a private
  `brand-hub.json` (new `BrandHubSchema`): logos, copyable color values, AA
  pairings and a contrast checker, type specimens and tester, token-styled
  components, voice, imagery, rules, and downloadable token files. `summit intake`
  now writes `brand-hub.draft.json`, and `verify-split` rejects brand hub content
  in a site repo. See docs/BRAND_HUB.md.
- 06ebc9d: Add `summit proposal build` and `summit proposal publish` (SUMMIT-247): estimate, maintenance contract and hosted proposal page generated from site.config.json and a private rate card, published to unlisted Cloudflare Pages URLs. Adds `RateCardSchema` and `EngagementSchema`, makes `effort` required on registry components, and adds a public style guide page to `summit preview`.
- dffa41e: Publish proposals as an assets-only Cloudflare Worker instead of a Pages project (SUMMIT-247). `summit proposal publish` now runs `wrangler deploy --assets`, and share links are built on `https://<project>.<workersSubdomain>.workers.dev/`. The rate card gains `proposals.workersSubdomain`; `summit proposal build` fails with a clear message when neither it nor `proposals.baseUrl` is set.

### Patch Changes

- cbcc21c: decide: `decide init --existing` recognizes GitHub Pages from a workflow that
  uses `actions/deploy-pages` or `actions/upload-pages-artifact`, or a
  `.nojekyll` file, as well as `CNAME`, instead of defaulting such a site to
  Cloudflare Pages.
- 1061cdc: intake: a button variant named primary (`.btn--primary`, `.btn-primary`) sets
  `primary` and `onPrimary`, so a site whose bare `.btn` has no background no
  longer falls back to the text colour with a guessed `onPrimary`. Other variants
  still feed `accent`.
- c1a5a20: new: seeded workflows install the CLI from the codeload tarball of its release
  tag's commit (resolved with `git ls-remote` over HTTPS) instead of a mutable
  `github:` tag that npm fetches over SSH. Actions are pinned by commit, checkout
  sets `persist-credentials: false`, and `ci.yml` has top-level
  `permissions: contents: read`, so a new client repo passes zizmor.

## 0.2.0

### Minor Changes

- schemas: add `SiteConfigSchema`, the Decisions stage output (pages of
  registry components or kept existing elements, stack and host with reasons,
  redirects).

  cli: add `summit decide init|validate|docs`. New client repos validate
  `decisions/site.config.json` in CI once it exists.
