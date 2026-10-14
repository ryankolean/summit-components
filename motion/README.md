# Motion

Reference library for adding motion to Summit and client websites (SUMMIT-281).
It is not a package: nothing here is installed. Agents read the rules, then copy
the pattern they need from `examples/` into the site.

```bash
open motion/index.html
```

## What's here

- `AGENTS.md` - the rules for adding motion to any site: which tool when, timing, accessibility, performance
- `index.html` - gallery of every example plus inspiration links
- `examples/01-08` - single-file working demos (CSS scroll reveal, View Transitions, GSAP hero intro, ScrollTrigger, Flip, micro-interactions, Motion springs, SVG drawing)
- `shared/motion.css` - duration/easing tokens and the reduced-motion block to copy into projects
- `INSPIRATION.md` - where to find new ideas

Examples load GSAP 3.13.0 and Motion 11.11.17 from jsDelivr, so they work straight from `file://` with an internet connection.

## Using it in a site

Add one line to the site's `AGENTS.md` or `CLAUDE.md`:

> For animation, follow `motion/AGENTS.md` in ryankolean/summit-components (local clone: `~/code/summit-components/motion/`) and reuse its examples.

Or ask directly:

> Read motion/AGENTS.md in summit-components, then add the hero intro from examples/03 and the scroll reveal from examples/01 to this homepage.

New patterns found while building a site come back here as `examples/09+`.

## Tooling

| Tool | Install | Notes |
|---|---|---|
| Official GSAP skills | `claude plugin marketplace add greensock/gsap-skills`, then `claude plugin install gsap-skills@gsap-skills` | Maintained by GreenSock; core, timeline, ScrollTrigger, plugins, React, frameworks, performance, utils |
| GSAP | `npm i gsap @gsap/react` | 100% free incl. all former Club plugins, commercial use OK |
| Motion | `npm i motion` | React-first; import from `motion/react` |
| Motion+ AI Kit (optional, paid one-time) | `npx motion-ai` after buying Motion+ | MCP with current Motion docs + premium example source, `/motion` skill |
| Lenis (optional) | `npm i lenis` | Smooth scroll, syncs with ScrollTrigger |
| Lottie / Rive (optional) | `npm i @lottiefiles/dotlottie-web` / `@rive-app/canvas` | For designer-made animations |
