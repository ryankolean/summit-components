# Adding a stack

A stack is added when it shows up in real client work (see the revisit rules in
STACK_DECISION.md), not speculatively.

1. **Add it to `STACKS`** in `packages/schemas/src/registry.ts`. Decide whether
   it can run a build and import a package (add it to `FRAMEWORK_STACKS`) or not
   (then components reach it through `html` or `embed`). Add a registry test.
2. **Decide how components render there.** If it renders React on the server
   (like Astro or Next), the existing React components work unchanged. If it
   renders something else, prefer the HTML renderers over writing a new
   component flavour; a new flavour must join the parity test.
3. **Teach the checks where the built HTML lands.** Checks only read built
   output. Document the build command and output directory for the stack, and
   the `--base` it is served under, in the adoption notes (SUMMIT-253).
4. **Add a site template** if new sites should be able to start on it.
5. **Update `registry.json`** entries that support the new stack, then
   `pnpm registry:check`.
6. **Update STACK_DECISION.md** with when to choose it.
