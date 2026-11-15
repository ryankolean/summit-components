# @summit/schemas

## 0.3.0

### Minor Changes

- 33dbfe8: Add the brand hub: `summit brand-hub <intake-dir>` builds one self-contained,
  interactive page for the client from `site/brand.json` and a private
  `brand-hub.json` (new `BrandHubSchema`): logos, copyable color values, AA
  pairings and a contrast checker, type specimens and tester, token-styled
  components, voice, imagery, rules, and downloadable token files. `summit intake`
  now writes `brand-hub.draft.json`, and `verify-split` rejects brand hub content
  in a site repo. See docs/BRAND_HUB.md.
- 9e749ec: Add an optional `link` colour role to `BrandSchema`: the text colour for links
  and outline buttons on `bg`, for brands whose `primary` is a fill that cannot be
  read as text. `toCssVariables` emits it as `--summit-color-link` when set.
  `checkContrast` then checks `link on bg` in place of `primary on bg`; without
  it, nothing changes. The templates colour links with `--summit-color-link`,
  falling back to `--summit-color-primary`.
- 06ebc9d: Add `summit proposal build` and `summit proposal publish` (SUMMIT-247): estimate, maintenance contract and hosted proposal page generated from site.config.json and a private rate card, published to unlisted Cloudflare Pages URLs. Adds `RateCardSchema` and `EngagementSchema`, makes `effort` required on registry components, and adds a public style guide page to `summit preview`.
- dffa41e: Publish proposals as an assets-only Cloudflare Worker instead of a Pages project (SUMMIT-247). `summit proposal publish` now runs `wrangler deploy --assets`, and share links are built on `https://<project>.<workersSubdomain>.workers.dev/`. The rate card gains `proposals.workersSubdomain`; `summit proposal build` fails with a clear message when neither it nor `proposals.baseUrl` is set.

## 0.2.0

### Minor Changes

- schemas: add `SiteConfigSchema`, the Decisions stage output (pages of
  registry components or kept existing elements, stack and host with reasons,
  redirects).

  cli: add `summit decide init|validate|docs`. New client repos validate
  `decisions/site.config.json` in CI once it exists.
