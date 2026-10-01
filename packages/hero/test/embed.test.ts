// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from "vitest";
import { renderHero } from "@summit/hero/html";

beforeAll(async () => {
  await import("@summit/hero/embed");
});

describe("<summit-hero>", () => {
  it("renders from data-config when it has no server-rendered content", () => {
    const config = { title: "Oysters", lede: "Thu to Mon" };
    const el = document.createElement("summit-hero");
    el.setAttribute("data-config", JSON.stringify(config));
    document.body.append(el);
    expect(el.innerHTML).toBe(renderHero(config));
  });

  it("reads config from a JSON script child", () => {
    const el = document.createElement("summit-hero");
    el.innerHTML = `<script type="application/json">{"title":"From script"}</script>`;
    document.body.append(el);
    expect(el.innerHTML).toBe(renderHero({ title: "From script" }));
  });

  it("leaves server-rendered content untouched", () => {
    const prerendered = renderHero({ title: "Already here" });
    const el = document.createElement("summit-hero");
    el.setAttribute("data-config", JSON.stringify({ title: "Would replace" }));
    el.innerHTML = prerendered;
    document.body.append(el);
    expect(el.innerHTML).toBe(prerendered);
  });
});
