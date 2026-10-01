import { defineConfig } from "vitest/config";

// Workspace packages expose a "source" export condition so tests run against src
// without a build. Vitest resolves through the SSR conditions, so set both.
export default defineConfig({
  resolve: {
    conditions: ["source", "module", "browser", "development|production"],
  },
  ssr: {
    resolve: {
      conditions: ["source", "module", "node", "development|production"],
    },
  },
  test: {
    include: ["packages/*/test/**/*.test.{ts,tsx}"],
  },
});
