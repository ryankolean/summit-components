# Stack decision rule

The stack is chosen per site in the Decisions stage (SUMMIT-246) and recorded
with its reason in `site.config.json`. Components do not care: every component
ships a React rendering, an HTML rendering and, where it helps, a custom element.

## New sites

| The site needs | Use | Why |
|---|---|---|
| Content pages: menus, hours, about, events, galleries | **Astro** | Static HTML by default, React islands only where needed, content collections for menus and listings. Best crawlability for SEO and answer engines. |
| Accounts, a database, server actions, file uploads, portals | **Next** | Server features in one app. Pamar (careers, subcontractor portal) is the reference. |
| A single-page app with heavy client state and little SEO value | **Vite + React** | Only when SEO does not matter; otherwise prefer Astro. |

## Existing sites

The default is **keep the stack**. Existing sites adopt the framework in place
(SUMMIT-253):

| Existing stack | How components arrive |
|---|---|
| Static HTML (Umbo, Meantime) | Pasted `render*()` output plus the component CSS |
| No-build React (Fly Trap) | Pasted HTML, or the custom element. Never add a build step to a repo whose rules forbid one. |
| Astro, Next, Vite | The React component from the package |

Re-platforming is a per-element decision in Decisions, made only when it pays
for itself, and done page by page behind the same URLs.

## Hosting

GitHub Pages cannot serve 301 redirects or response headers. It fits previews
and sites with no legacy URLs and no header needs. For production, the default
recommendation is Cloudflare Pages (`_redirects`, `_headers`, DNS, analytics and
Turnstile in one account). Record the choice and the reason.

## When to revisit this rule

- A new stack shows up in two or more client sites
- A stack in this table stops being maintained or changes its rendering model
- A component cannot meet the parity rule on a listed stack
