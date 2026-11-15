# summit-next-site

## 0.0.3

### Patch Changes

- 9e749ec: Add an optional `link` colour role to `BrandSchema`: the text colour for links
  and outline buttons on `bg`, for brands whose `primary` is a fill that cannot be
  read as text. `toCssVariables` emits it as `--summit-color-link` when set.
  `checkContrast` then checks `link on bg` in place of `primary on bg`; without
  it, nothing changes. The templates colour links with `--summit-color-link`,
  falling back to `--summit-color-primary`.
- Updated dependencies [33dbfe8]
- Updated dependencies [9e749ec]
- Updated dependencies [b1bb7df]
- Updated dependencies [06ebc9d]
- Updated dependencies [dffa41e]
  - @summit/schemas@0.3.0
  - @summit/tokens@0.2.0
  - @summit/hero@0.3.0
  - @summit/seo@0.1.3

## 0.0.2

### Patch Changes

- Updated dependencies
  - @summit/schemas@0.2.0
  - @summit/hero@0.2.1
  - @summit/seo@0.1.2
  - @summit/tokens@0.1.1

## 0.0.1

### Patch Changes

- Updated dependencies [5a9e467]
- Updated dependencies [b792aa7]
  - @summit/hero@0.2.0
  - @summit/seo@0.1.1
