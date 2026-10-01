# AGENTS.md

Instructions for any agent working in this repo. Read README.md first.

## Rules

- **This repo is public.** Never commit client data: no private intake,
  pricing, contacts, credentials or unreleased client copy. Templates and
  examples use sample content on `example.com` only. Client audit results
  belong in Jira or the client's repo, not here.
- **Branch and PR.** Never commit to `main` directly. Branch `jira/<KEY>` or
  `feat/<topic>`, open a PR, and leave merging to Ryan.
- **Conventional commits**, imperative and lowercase: `feat: add gallery component (SUMMIT-248)`.
- **No emojis and no em dashes** in code, docs or commits.
- **Every package change gets a changeset** (`pnpm changeset`). Never hand-edit
  versions; `pnpm version-packages` bumps them and syncs `registry.json`.
- **Components style only against `--summit-*` tokens**, with a fallback value
  in every `var()`. No hard-coded brand colors or fonts.
- **Every rendering of a component produces identical markup.** Each component
  has a parity test comparing the React render with the HTML renderer. Never
  weaken it to make a change pass.
- **The html and embed entrypoints import nothing at runtime** except relative
  files, so they load in a plain page with no bundler. Schemas (zod) stay in the
  main entrypoint.
- **`EntitySchema` holds public facts only.** It is committed to client site
  repos, and older client repos are public and publish their repo root.
  Private intake (pain points, competitors, pricing, contacts) never goes in a
  site repo.
- **Checks read built HTML, never source.** A check that needs to know the
  stack is in the wrong place.

## Verify before opening a PR

```bash
pnpm typecheck && pnpm test && pnpm build && pnpm registry:check && pnpm example && git diff --exit-code -- packages/hero/example && pnpm templates:verify
```

Never create or push release tags by hand; the `release` workflow owns them.

For a visual change, serve `packages/hero` (launch config
`summit-components-hero`, port 8773), open `/example/`, and check 375, 768 and
1280 px with no horizontal overflow at 375.
