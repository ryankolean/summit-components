# @summit/cli

## 0.2.0

### Minor Changes

- schemas: add `SiteConfigSchema`, the Decisions stage output (pages of
  registry components or kept existing elements, stack and host with reasons,
  redirects).

  cli: add `summit decide init|validate|docs`. New client repos validate
  `decisions/site.config.json` in CI once it exists.
