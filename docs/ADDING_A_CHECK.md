# Adding a check

Checks live in `packages/checks/src/checks.ts` and run against **built HTML**,
never source, so one check covers every stack and every existing site.

## 1. Write the failing test first

`packages/checks/test/checks.test.ts` builds small sites in a temp directory.
Add a case that reproduces the real failure, ideally one that has already cost
time on a client site (the base-path separator test is the 4PM bug; the
`Disallow: /` test is the Meantime trap).

## 2. Implement it

```ts
export const myCheck: Check = {
  id: "my-check",               // kebab-case, stable: reports and CI refer to it
  description: "one line a client could read",
  run(site, { mode, allowNoindex }) {
    return []; // Finding[]: { check, severity: "error" | "warn", message, page? }
  },
};
```

Add it to `ALL_CHECKS`.

## 3. Pick the severity carefully

- **error**: the site is broken or will be harmed (deindexed, broken links,
  invalid structured data, missing alt). `gate` mode fails the deploy on these.
- **warn**: worth fixing but not a reason to block a launch.

A check that errors on something clients routinely do on purpose needs an
opt-out option (like `--allow-noindex`), not a lower severity.

## 4. Respect the mode

`production` expects the site open to crawlers; `preview` expects it closed. If
the check only makes sense in one mode, return `[]` in the other.

## 5. Try it on real sites

Before opening the PR, run `audit` against at least one static site (a repo
root such as Umbo) and one framework build (such as a 4PM `dist/`), and read
every finding to make sure it is true.
