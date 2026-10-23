# Intake (Stage 1)

`@summit/cli` provides the `summit` command. Install it from the commit of a
release tag, over HTTPS (this is `cli-v0.2.0`):

```bash
npm install --global https://codeload.github.com/ryankolean/summit-components/tar.gz/49936982af8826b87021c3a991581610b4d41dec
```

For another version, take the commit from
`git ls-remote https://github.com/ryankolean/summit-components.git refs/tags/cli-v<version>`.

Intake turns a client's existing site (or the owner's answers) into two kinds
of output, kept in two different places:

| Output | Where it lives | Public? |
|---|---|---|
| `site/entity.json`, `site/brand.json` | The client's site repo | Yes. Public facts only, validated against `@summit/schemas` |
| `intake-report.md`, `entity-profile.md`, `style-guide.md` | The private Summit intake repo, one folder per client | **Never** in a site repo |

Every private document starts with a marker line. `summit verify-split` fails
any site repo that contains it, contains a private intake filename, or has an
`entity.json` key outside the schema. Client CI runs it on every push.

## Existing site

```bash
summit intake ~/umbo --out <intake-repo>/umbo
```

Reads a repo root published as-is, or a built output directory, without
changing it:

- **Brand:** colors come from the rules that use them. The page background and
  text are from `body`, primary from the base button, and accent from a button
  variant. Fonts come from `body` and `h1`. Every role is labeled
  **measured** or **inferred** in `intake-report.md`, and contrast is checked.
- **Entity:** business facts come from the site's JSON-LD (any page, including
  `@graph`): address, geo, hours, menu link, FAQ, `sameAs`. Anything the site
  does not publish is listed as an owner question.

When the site has no usable facts, the files are written as
`entity.draft.json` / `brand.draft.json` with the validation errors in the
report. Fill them in from the owner's answers and rename them.

## New client

```bash
summit new <repo-name> --intake <intake-repo>/<client> [--private] [--dry-run]
```

1. Creates the repo (public unless `--private`) and seeds it with the intake's
   public facts, a README, AGENTS.md, a PR template, CI (`verify-split`,
   preview build, preview gate) and a Pages workflow for the intake preview.
2. Protects `main`: no force pushes, no deletions, and `ci` must pass.
3. Enables GitHub Pages and runs the first preview deploy.

Client repos are public by default: they hold public facts only, and branch
protection and Pages are free on public repos. With `--private`, those two
steps need a paid GitHub plan and are reported as skipped, not failed, when the
plan does not allow them. Run with `--dry-run` first to see every command.

Private intake lives in the private `ryankolean/summit-intake` repo, one folder
per client: `summit intake <site> --out ~/code/summit-intake/<client>`.

## Preview

```bash
summit preview <repo> --out _preview
```

A stack-neutral page built only from `site/*.json`: brand tokens, the hero,
hours, address, and FAQ, with JSON-LD and `llms.txt`. It is always `noindex`.
It is what a new client repo deploys until Decisions picks a stack.
