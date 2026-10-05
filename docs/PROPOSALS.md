# Proposals: estimate, contract and proposal page

`summit proposal` turns a client's Decisions output into the paperwork a client
signs (SUMMIT-247). Every number comes from `site.config.json`, the registry and
the rate card, so pricing and scope never drift from what gets built: change a
component in `site.config.json` and the estimate, the contract's setup fee and
the proposal all change with it.

## What is public and what is not

This repo is public, so it holds the **shapes** and never the **values**.

| Input | Where it lives | Public? |
|---|---|---|
| Effort size per component (`effort` in `registry.json`) | this repo | yes |
| `RateCardSchema`, `EngagementSchema` | `@summit/schemas` | yes |
| The rate card: hourly rate, hours per effort size, tier fees | `summit-intake/_summit/rate-card.json` | **no** |
| `engagement.json`: legal name, contacts, contract values | `summit-intake/<client>/engagement.json` | **no** |
| Maintenance agreement template (SUMMIT-196) | `summitsoftwaresolutionsllc/docs/contracts/` | **no** |
| Generated estimate, contract and proposal | `summit-intake/<client>/out/` | **no**, gitignored |

The output folder writes its own `.gitignore` (`*`), so a generated contract
cannot be committed even from a repo that forgot the ignore rule.

## Build

```bash
summit proposal build <client-dir> --rates _summit/rate-card.json
```

Inputs default to `<client-dir>/decisions/site.config.json`,
`<client-dir>/site/entity.json` and `<client-dir>/engagement.json`; pass
`--config`, `--entity` or `--engagement` when they live elsewhere (a client
repo's `decisions/`, for example). Output goes to `<client-dir>/out/`:

| File | What it is |
|---|---|
| `estimate.json`, `estimate.html`, `estimate.pdf` | Line items, total, deposit and balance, monthly care |
| `contract.md`, `contract.html`, `contract.pdf` | The SUMMIT-196 maintenance agreement, filled in |
| `proposal/index.html` | The hosted proposal page, with an acceptance block |
| `share.json` | The proposal, preview and style guide links |

PDFs are printed by the Chrome already on the machine (`SUMMIT_CHROME` to point
at another binary), so nothing downloads a browser. Without Chrome the HTML is
still print-ready; `--no-pdf` skips printing.

### How the estimate is priced

| Line | Hours |
|---|---|
| Each `baseline` item on the rate card | as listed |
| Each page with `"source": "new"` | `pageHours` |
| Each component section | `effortHours[registry effort size]`, times `adoptFactor` for `"status": "adopt"` |
| Redirects | `redirectHours` per redirect |
| `lineItems` in the engagement | the hours or fixed amount given |

Hours are priced at `hourlyRate`. Existing sections cost nothing: `keep` is
listed as kept, `replace-later` as quoted separately. A `discount` comes off
the subtotal. `depositPercent` of the total is due on acceptance, the rest at
launch. With a `tier`, the monthly fee and included update hours come from the
rate card.

### The contract

The contract is the SUMMIT-196 maintenance agreement. `contractTemplate` in the
rate card points at it (relative to the rate card), or pass `--contract`. Values
come from three places, in order:

1. `contractDefaults` on the rate card: what every client shares (provider
   address, response targets, payment terms).
2. `contract` in `engagement.json`: this client's facts. An array repeats the
   template line once per value, so two third-party services become two table
   rows; an empty array drops the line.
3. Computed values, which cannot be set by hand: `CLIENT_LEGAL_NAME`,
   `PROPERTY_NAME`, `PROPERTY_DOMAIN`, `SERVICE_TIER`, `MONTHLY_FEE`,
   `INCLUDED_UPDATE_ALLOWANCE`, `HOURLY_RATE`, `AFTER_HOURS_RATE`, `SETUP_FEE`
   (the estimate total) and the tier inclusions. Setting one of these in the
   engagement or the defaults is an error, because that is how a contract drifts
   from its quote.

The template banner and every `[Drafting note: ...]` are stripped. Like the
SUMMIT-196 renderer, the build **refuses** to render a contract while any
`{{PLACEHOLDER}}` or warning-sign marker remains, and lists each one. `--draft`
renders it anyway, stamped "Draft, not for signature" on every printed page.
A contract built from an example rate card is stamped too and is never
signature-ready.

The template is a maintenance agreement. The one-time build fee is accepted
through the proposal's acceptance block; a separate build agreement does not
exist yet.

## Publish

```bash
summit proposal publish ~/code/summit-intake
```

Collects every `<client>/out/proposal/` under the intake root into one site and
deploys it to the Cloudflare Pages project `summit-proposals` (override with
`--project`) with `npx wrangler@4`. Each proposal lives at
`https://summit-proposals.pages.dev/<proposalSlug>/`. The site sends
`X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer` and `Cache-Control:
no-store` on every path, its robots.txt disallows everything, and the root page
is blank, so a proposal is reachable only by its link. After deploying, every
share link is fetched and must answer 200; the proposal must also carry the
noindex header.

A deploy replaces the whole site. A proposal stays live only while its `out/`
folder exists: delete the folder and publish again to take the link down.
Changing `proposalSlug` breaks the link the client has.

`--dry-run` stages the site in `<intake-root>/_publish/` without deploying.

One-time setup per Cloudflare account (the login is interactive OAuth, or set
`CLOUDFLARE_API_TOKEN` from 1Password):

```bash
npx wrangler@4 login
npx wrangler@4 pages project create summit-proposals --production-branch main
```

## Share links

- **Proposal:** the unlisted Cloudflare Pages URL above.
- **Preview:** `links.preview` in the engagement, usually the client repo's
  GitHub Pages preview.
- **Style guide:** `links.styleGuide`, or `style-guide/` under the preview.
  `summit preview` writes it from `brand.json` alone (palette roles with
  contrast, type, radius), so it is safe on a public preview. Private brand
  notes stay in the intake repo's `style-guide.md`.

## Rate card and engagement

Shapes are `RateCardSchema` and `EngagementSchema` in
`packages/schemas/src/commercial.ts`. Worked examples, with example rates only,
are in `packages/cli/test/fixtures/commercial/`. A rate card with
`"example": true` stamps every document it produces.

`proposalSlug` must be 16 to 64 lowercase letters and digits. Generate one with:

```bash
python3 -c "import secrets; print(secrets.token_hex(10))"
```
