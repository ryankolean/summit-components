# @summit/hero

## 0.3.0

### Minor Changes

- b1bb7df: Close the gaps found matching an existing design (the Roses hero pilot), so a
  site no longer overrides component rules:

  - `image` takes `srcset`, `sizes`, `fetchpriority` and `sources` (type and
    srcset, e.g. AVIF and WebP). With `sources`, the `<img>` is wrapped in a
    `<picture class="summit-hero__picture">` and each source inherits the image's
    `sizes` unless it sets its own.
  - `layout: "stacked"` keeps text over the image at every width. `"split"`, the
    default, is unchanged.
  - Hero tokens for the box width, block and inline padding, gap, title and lede
    size, CTA padding and CTA font, and separate CTA and media radius, each
    falling back to the current value. The full list is at the top of `hero.css`.
  - Per-variant CTA colour tokens: filled background and text, outline text and
    border, and hover colours for each. The outline CTA reads the brand's new
    `link` role before `primary`.
  - CTA colours are set for every link state at two-class specificity, so a
    site's `a:link`, `a:visited` or `a:hover` rule no longer recolours them. A
    single-class site rule that set a CTA's `color`, `background` or
    `border-color` now loses; set the tokens instead.

  Markup and computed styles are unchanged for existing props.

### Patch Changes

- Updated dependencies [33dbfe8]
- Updated dependencies [9e749ec]
- Updated dependencies [06ebc9d]
- Updated dependencies [dffa41e]
  - @summit/schemas@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies
  - @summit/schemas@0.2.0

## 0.2.0

### Minor Changes

- 5a9e467: Add a React-free `@summit/hero/config` entry exporting `HeroConfigSchema`, for
  tools that validate hero config without rendering it.
