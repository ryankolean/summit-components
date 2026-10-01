import { renderHero } from "./html.js";
import type { HeroProps } from "./types.js";

// Importing this module outside a browser must not throw, so the base class is resolved lazily.
const Base = (globalThis.HTMLElement ?? class {}) as typeof HTMLElement;

/**
 * <summit-hero> for sites with no build step. Prefer pasting renderHero()
 * output inside the element: the element then leaves it alone and crawlers see
 * the content. Rendering from data-config or a JSON script child is the
 * fallback for pages that cannot be edited that way.
 */
export class SummitHero extends Base {
  connectedCallback() {
    if (this.querySelector(".summit-hero")) return;
    const raw =
      this.getAttribute("data-config") ??
      this.querySelector('script[type="application/json"]')?.textContent;
    if (!raw) return;
    this.innerHTML = renderHero(JSON.parse(raw) as HeroProps);
  }
}

export function defineSummitHero(name = "summit-hero"): void {
  if (typeof customElements === "undefined" || customElements.get(name)) return;
  customElements.define(name, SummitHero);
}

defineSummitHero();
