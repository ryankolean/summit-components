---
"@summit/cli": patch
---

intake: a button variant named primary (`.btn--primary`, `.btn-primary`) sets
`primary` and `onPrimary`, so a site whose bare `.btn` has no background no
longer falls back to the text colour with a guessed `onPrimary`. Other variants
still feed `accent`.
