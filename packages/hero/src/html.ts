import { assertSafeHref, type HeroCta, type HeroImage, type HeroProps } from "./types.js";

export type { HeroCta, HeroImage, HeroImageSource, HeroProps } from "./types.js";

// Matches React's escaping so the string and React renderings stay byte-identical.
const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};
const esc = (value: string | number) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]!);
const attr = (name: string, value: string | undefined) => (value === undefined ? "" : ` ${name}="${esc(value)}"`);

const cta = (link: HeroCta, variant: "primary" | "secondary") =>
  `<a class="summit-hero__cta summit-hero__cta--${variant}" href="${esc(assertSafeHref(link.href))}">${esc(link.label)}</a>`;

// React's server renderer writes srcSet and fetchPriority in camelCase. HTML
// attribute names are case-insensitive, so the same casing is used here.
function media(image: HeroImage): string {
  const img =
    `<img class="summit-hero__media" src="${esc(image.src)}"${attr("srcSet", image.srcset)}${attr("sizes", image.sizes)}` +
    ` alt="${esc(image.alt)}" width="${esc(image.width)}" height="${esc(image.height)}" decoding="async"` +
    `${attr("fetchPriority", image.fetchpriority)}/>`;
  if (!image.sources?.length) return img;
  const sources = image.sources
    .map((s) => `<source type="${esc(s.type)}" srcSet="${esc(s.srcset)}"${attr("sizes", s.sizes ?? image.sizes)}/>`)
    .join("");
  return `<picture class="summit-hero__picture">${sources}${img}</picture>`;
}

/**
 * The hero as an HTML string. Static-HTML and no-build sites paste this output
 * directly, so the content is in the page for crawlers with no JavaScript.
 */
export function renderHero(props: HeroProps): string {
  const { id = "hero", headingLevel = 1, align = "start", layout = "split", eyebrow, title, lede, image } = props;
  const tag = `h${headingLevel}`;
  const classes = ["summit-hero", `summit-hero--${align}`];
  if (image) classes.push("summit-hero--with-media");
  if (layout === "stacked") classes.push("summit-hero--stacked");

  let body = "";
  if (eyebrow) body += `<p class="summit-hero__eyebrow">${esc(eyebrow)}</p>`;
  body += `<${tag} id="${esc(id)}-title" class="summit-hero__title">${esc(title)}</${tag}>`;
  if (lede) body += `<p class="summit-hero__lede">${esc(lede)}</p>`;
  if (props.primaryCta || props.secondaryCta) {
    body += `<div class="summit-hero__actions">`;
    if (props.primaryCta) body += cta(props.primaryCta, "primary");
    if (props.secondaryCta) body += cta(props.secondaryCta, "secondary");
    body += `</div>`;
  }

  let html = `<section class="${classes.join(" ")}" aria-labelledby="${esc(id)}-title">`;
  html += `<div class="summit-hero__body">${body}</div>`;
  if (image) html += media(image);
  return `${html}</section>`;
}
