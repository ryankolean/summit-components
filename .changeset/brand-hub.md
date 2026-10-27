---
"@summit/schemas": minor
"@summit/cli": minor
---

Add the brand hub: `summit brand-hub <intake-dir>` builds one self-contained,
interactive page for the client from `site/brand.json` and a private
`brand-hub.json` (new `BrandHubSchema`): logos, copyable color values, AA
pairings and a contrast checker, type specimens and tester, token-styled
components, voice, imagery, rules, and downloadable token files. `summit intake`
now writes `brand-hub.draft.json`, and `verify-split` rejects brand hub content
in a site repo. See docs/BRAND_HUB.md.
