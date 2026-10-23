---
"@summit/cli": patch
---

decide: `decide init --existing` recognizes GitHub Pages from a workflow that
uses `actions/deploy-pages` or `actions/upload-pages-artifact`, or a
`.nojekyll` file, as well as `CNAME`, instead of defaulting such a site to
Cloudflare Pages.
