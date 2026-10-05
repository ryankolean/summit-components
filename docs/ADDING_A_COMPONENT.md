# Adding a component

Copy the shape of `packages/hero`. A component is one package, so its React,
HTML and custom-element renderings are always versioned together.

## 1. Package layout

```
packages/<name>/
  package.json        exports ".", "./html", "./embed" (optional), "./<name>.css"
  tsconfig.build.json copy from packages/hero
  src/types.ts        props interface, no runtime imports
  src/html.ts         render<Name>(props): string
  src/<Name>.tsx      React component with the same markup
  src/config.ts       <Name>ConfigSchema (zod), for site.config.json
  src/embed.ts        custom element, only if a no-build site needs it
  src/<name>.css      styles against --summit-* tokens only
  src/index.ts        exports the React component, schema and types
  example/build.mjs   generates example/index.html from the built package
  test/<name>.test.tsx
```

Add the package to the root `package.json` devDependencies as `workspace:*` so
tests resolve it by name.

## 2. Rules the tests enforce

- **Parity:** a test renders every representative prop set through React and
  through `render<Name>()` and asserts identical strings. Escape text the way
  React does (`& < > " '`).
- **Safe URLs:** reject `javascript:` and other script URLs in both the schema
  and the renderer.
- **Accessibility:** one landmark with an accessible name, a heading level the
  caller controls, alt text required on images, 44px minimum touch targets,
  visible focus styles.
- **Content without JavaScript:** the custom element must leave pre-rendered
  markup alone.

## 3. Register it

Add an entry to `registry.json`:

- `stacks`: every stack it supports. Framework stacks need a `react` or `html`
  entrypoint; `static-html` and `nobuild-react` need `html` or `embed`.
- `entrypoints`: package specifiers that match the package's `exports`.
- `effort` (required for components): `xs`, `s`, `m`, `l` or `xl`, the work to
  place and configure one instance on a page. The private rate card turns a
  size into hours, so the size is public and the price is not. Size it against
  `hero` (`s`): a component with real behavior (a menu, a gallery with a
  lightbox) is `m` or larger. Changing a size reprices every estimate that uses
  the component. See [PROPOSALS.md](PROPOSALS.md).
- `configSchema`, `example` and `dependsOn`.

`pnpm registry:check` fails if the entry disagrees with the package.

Then add its config schema to `COMPONENT_CONFIG_SCHEMAS` in
`packages/cli/src/decide.ts`, importing it from a React-free entry (like
`@summit/hero/config`). Without that, `summit decide validate` places the
component but warns that its config is not validated.

## 4. Ship it

```bash
pnpm changeset   # minor for a new component
```

Run the full verify line from AGENTS.md, then check the example page at 375,
768 and 1280 px.
