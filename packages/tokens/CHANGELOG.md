# @summit/tokens

## 0.2.0

### Minor Changes

- 9e749ec: Add an optional `link` colour role to `BrandSchema`: the text colour for links
  and outline buttons on `bg`, for brands whose `primary` is a fill that cannot be
  read as text. `toCssVariables` emits it as `--summit-color-link` when set.
  `checkContrast` then checks `link on bg` in place of `primary on bg`; without
  it, nothing changes. The templates colour links with `--summit-color-link`,
  falling back to `--summit-color-primary`.

### Patch Changes

- Updated dependencies [33dbfe8]
- Updated dependencies [9e749ec]
- Updated dependencies [06ebc9d]
- Updated dependencies [dffa41e]
  - @summit/schemas@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies
  - @summit/schemas@0.2.0
