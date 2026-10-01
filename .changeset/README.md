# Changesets

Every PR that changes a published package adds a changeset:

```bash
pnpm changeset
```

Pick only the packages you changed and the bump type. `pnpm version-packages`
applies pending changesets, bumps just those packages, writes their changelogs,
and syncs the new versions into `registry.json`.
