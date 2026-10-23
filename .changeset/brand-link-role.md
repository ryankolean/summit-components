---
"@summit/schemas": minor
"@summit/tokens": minor
"summit-astro-site": patch
"summit-next-site": patch
---

Add an optional `link` colour role to `BrandSchema`: the text colour for links
and outline buttons on `bg`, for brands whose `primary` is a fill that cannot be
read as text. `toCssVariables` emits it as `--summit-color-link` when set.
`checkContrast` then checks `link on bg` in place of `primary on bg`; without
it, nothing changes. The templates colour links with `--summit-color-link`,
falling back to `--summit-color-primary`.
