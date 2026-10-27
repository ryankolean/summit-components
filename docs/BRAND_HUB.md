# Brand hub

The brand hub is the client-facing replacement for a static style guide: one
self-contained, interactive HTML page Summit sends to a client. It turns the
intake's `site/brand.json` and a private `brand-hub.json` into:

| Section | What the client can do |
|---|---|
| Overview | Brand summary and the full palette at a glance |
| Logo | See each logo on its intended background, download the source file |
| Color | Copy any role as HEX, RGB or HSL; see every text pairing that passes WCAG AA; try any two colors in the contrast checker |
| Typography | Specimens and weights for both families, a live type tester, the heading scale |
| In use | Buttons, links, a card, a tag and a form field rendered from the tokens |
| Voice and tone | Traits with do and don't lines, before and after copy examples |
| Imagery | Direction and keywords |
| Do and don't | Usage rules |
| Downloads | `tokens.css`, `design-tokens.json` (DTCG, for Figma Tokens Studio), `tailwind.preset.js`, `brand.json`, every logo |

Everything is inlined, logos and token files included, so the page works as an
email attachment, a static host upload or a file opened locally. Every section
renders without JavaScript; scripts add copy buttons, the contrast checker, the
type tester and the active nav state. The page is `noindex` and prints cleanly
(Print, then Save as PDF) for clients who want a PDF.

## Where things live

| File | Where | Public? |
|---|---|---|
| `site/brand.json` | intake, then the client site repo | Yes |
| `brand-hub.json` (or `brand-hub.draft.json`) | private intake folder root | No. `verify-split` fails a site repo that holds it |
| `assets/logos/*` | private intake folder | No |
| `out/brand-hub/index.html` | private intake folder, git-ignored | Sent to the client |

## Steps

1. `summit intake` writes `brand-hub.draft.json` with empty strings to fill in.
   An empty string means "not yet" and renders as a pending marker.
2. Put logo source files (SVG preferred, or PNG, JPG, WebP) in `assets/logos/`
   and list them under `logos`. `on` is the color role to show each one on.
3. Fill in `summary`, `colorUsage`, `voice`, `imagery` and `rules` from the
   owner's answers. Schema: `BrandHubSchema` in `@summit/schemas`.
4. Build a review copy while the draft is still a draft:

   ```bash
   summit brand-hub ~/code/summit-intake/<client>
   ```

   With no `brand-hub.json`, the page carries a draft banner.
5. Rename to `brand-hub.json`, rebuild, and fix every `warn:` line (missing
   logo, unknown color role).
6. Ryan reviews `out/brand-hub/index.html` before it is sent or hosted.

## Fonts

Unset, `fontStylesheets` requests both families from Google Fonts with the
weights in `brand.json`. Set it to the brand's own stylesheet URLs (https only)
for fonts licensed elsewhere, or `[]` for fonts the client has installed.
