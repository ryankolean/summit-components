# Motion rules for Summit sites

When adding animation to any Summit or client website, follow these rules. The `examples/` folder holds one working reference per pattern; copy from those instead of inventing new code.

## Pick the lightest tool that does the job

| Need | Use | Reference |
|---|---|---|
| Hover, press, focus, toggle, toast | Plain CSS transitions/keyframes | `examples/06` |
| Reveal on scroll, progress bar, simple parallax | CSS `animation-timeline: view()/scroll()` inside `@supports` | `examples/01` |
| Page or element morph between states/routes | View Transitions API | `examples/02` |
| Orchestrated hero/page-load sequence | GSAP timeline (+ SplitText for type) | `examples/03` |
| Pinning, scrubbing, horizontal scroll, counters | GSAP ScrollTrigger | `examples/04` |
| Layout changes (filter, reorder, expand) | GSAP Flip | `examples/05` |
| React component state, gestures, springs, exit animations | Motion (`motion/react`) | `examples/07` |
| Logo/illustration line drawing | GSAP DrawSVG | `examples/08` |
| Designer-made animations | Lottie (`@lottiefiles/dotlottie-web`) or Rive | n/a |

Do not add both GSAP and Motion to the same project unless there is a clear reason.

## Timing and easing

Use the tokens in `shared/motion.css` (copy them into the project's CSS):
- Feedback 100-180ms, UI transitions ~300ms, section reveals ~600ms, page-load sequences up to ~900ms total per element.
- Ease-out for entrances, ease-in for exits (and make exits shorter), ease-in-out for moves across the screen.
- Overshoot (`back`) only on small playful elements, never on large layout.

## Non-negotiables

1. **Reduced motion.** Wrap JS motion in `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` or a `matchMedia` check. Keep the global reduced-motion CSS block. The page must be complete and readable with no motion.
2. **Complete at rest.** Never leave content at `opacity: 0` waiting for JS or an observer. Use `from` tweens or CSS that only hides when the animation is supported.
3. **Performance.** Animate `transform` and `opacity` only. No animating width, height, top, left, margin, or box-shadow on large areas. `will-change` only on elements that are actively animating.
4. **Cleanup.** In React/Next, use `useGSAP()` from `@gsap/react` (auto-reverts) and Motion's components; kill ScrollTriggers on route change.
5. **Restraint.** One signature moment per page (usually the hero) plus consistent micro-interactions. If everything moves, nothing stands out.
6. **Mobile.** Disable pinning and horizontal scroll under ~700px; stack instead.
7. **Imports.** GSAP from `gsap` (3.13+, every plugin is free incl. SplitText, MorphSVG, DrawSVG, ScrollSmoother). Motion from `motion` / `motion/react`, never `framer-motion`.

## Checking work

- Test with System Settings > Accessibility > Display > Reduce motion turned on.
- Run Lighthouse; CLS must not increase after adding motion.
- Scroll the page on a phone-width viewport.
