---
"@summit/seo": patch
"@summit/checks": minor
---

seo: `formatHours` collapses runs that wrap past Sunday ("Th-Mo"), so llms.txt
no longer lists Umbo's hours as "Mo,Th,Fr,Sa,Su".

checks: export the CLI as a `main(argv)` function so `summit check` can call it.
