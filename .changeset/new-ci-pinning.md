---
"@summit/cli": patch
---

new: seeded workflows install the CLI from the codeload tarball of its release
tag's commit (resolved with `git ls-remote` over HTTPS) instead of a mutable
`github:` tag that npm fetches over SSH. Actions are pinned by commit, checkout
sets `persist-credentials: false`, and `ci.yml` has top-level
`permissions: contents: read`, so a new client repo passes zizmor.
