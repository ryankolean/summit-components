import { describe, expect, it } from "vitest";
import { dependencyFields, installSpec, releaseOrder, tagCommit, workspacePackages } from "../lib/tags.mjs";

const commit = "9c04e300709f89664ed6d63f9a78899bb76e6b1c";

describe("installSpec", () => {
  it("points at the commit's codeload tarball, never a github: spec", () => {
    expect(installSpec("ryankolean/summit-components", commit)).toBe(
      `https://codeload.github.com/ryankolean/summit-components/tar.gz/${commit}`,
    );
  });
});

describe("tagCommit", () => {
  it("reads a lightweight tag", () => {
    expect(tagCommit(`${commit}\trefs/tags/hero-v0.2.1\n`, "hero-v0.2.1")).toBe(commit);
  });

  it("peels an annotated tag to its commit", () => {
    const out = `1111111111111111111111111111111111111111\trefs/tags/hero-v0.2.1\n${commit}\trefs/tags/hero-v0.2.1^{}\n`;
    expect(tagCommit(out, "hero-v0.2.1")).toBe(commit);
  });

  it("finds nothing for an unreleased tag or a tag that only shares a prefix", () => {
    expect(tagCommit("", "hero-v0.2.1")).toBeUndefined();
    expect(tagCommit(`${commit}\trefs/tags/hero-v0.2.10\n`, "hero-v0.2.1")).toBeUndefined();
  });
});

describe("releaseOrder", () => {
  const pkg = (deps = {}) => ({ dependencies: deps });

  it("releases every dependency before its dependents", () => {
    const packages = new Map([
      ["@summit/hero", pkg({ "@summit/schemas": "workspace:^", zod: "^4.1.5" })],
      ["@summit/seo", { peerDependencies: { "@summit/tokens": "workspace:^" } }],
      ["@summit/schemas", pkg()],
      ["@summit/tokens", pkg({ "@summit/schemas": "workspace:^" })],
    ]);
    expect(releaseOrder(packages)).toEqual(["@summit/schemas", "@summit/hero", "@summit/tokens", "@summit/seo"]);
  });

  it("ignores devDependencies, which a release drops", () => {
    const packages = new Map([
      ["@summit/hero", { devDependencies: { "@summit/tokens": "workspace:^" } }],
      ["@summit/tokens", pkg({ "@summit/hero": "workspace:^" })],
    ]);
    expect(releaseOrder(packages)).toEqual(["@summit/hero", "@summit/tokens"]);
  });

  it("rejects a cycle", () => {
    const packages = new Map([
      ["@summit/a", pkg({ "@summit/b": "workspace:^" })],
      ["@summit/b", pkg({ "@summit/a": "workspace:^" })],
    ]);
    expect(() => releaseOrder(packages)).toThrow(/cycle/);
  });

  it("orders this workspace's packages", () => {
    const packages = workspacePackages();
    const order = releaseOrder(packages);
    expect([...order].sort()).toEqual([...packages.keys()].sort());
    for (const [name, manifest] of packages) {
      for (const field of dependencyFields) {
        for (const dep of Object.keys(manifest[field] ?? {})) {
          if (packages.has(dep)) expect(order.indexOf(dep)).toBeLessThan(order.indexOf(name));
        }
      }
    }
  });
});
