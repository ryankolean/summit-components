---
"@summit/schemas": minor
"@summit/cli": minor
---

Publish proposals as an assets-only Cloudflare Worker instead of a Pages project (SUMMIT-247). `summit proposal publish` now runs `wrangler deploy --assets`, and share links are built on `https://<project>.<workersSubdomain>.workers.dev/`. The rate card gains `proposals.workersSubdomain`; `summit proposal build` fails with a clear message when neither it nor `proposals.baseUrl` is set.
