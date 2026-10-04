import { assertSafeHref } from "./types.js";
// Matches React's escaping so the string and React renderings stay byte-identical.
const ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
};
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
const cta = (link, variant) => `<a class="summit-hero__cta summit-hero__cta--${variant}" href="${esc(assertSafeHref(link.href))}">${esc(link.label)}</a>`;
/**
 * The hero as an HTML string. Static-HTML and no-build sites paste this output
 * directly, so the content is in the page for crawlers with no JavaScript.
 */
export function renderHero(props) {
    const { id = "hero", headingLevel = 1, align = "start", eyebrow, title, lede, image } = props;
    const tag = `h${headingLevel}`;
    const classes = ["summit-hero", `summit-hero--${align}`];
    if (image)
        classes.push("summit-hero--with-media");
    let body = "";
    if (eyebrow)
        body += `<p class="summit-hero__eyebrow">${esc(eyebrow)}</p>`;
    body += `<${tag} id="${esc(id)}-title" class="summit-hero__title">${esc(title)}</${tag}>`;
    if (lede)
        body += `<p class="summit-hero__lede">${esc(lede)}</p>`;
    if (props.primaryCta || props.secondaryCta) {
        body += `<div class="summit-hero__actions">`;
        if (props.primaryCta)
            body += cta(props.primaryCta, "primary");
        if (props.secondaryCta)
            body += cta(props.secondaryCta, "secondary");
        body += `</div>`;
    }
    let html = `<section class="${classes.join(" ")}" aria-labelledby="${esc(id)}-title">`;
    html += `<div class="summit-hero__body">${body}</div>`;
    if (image) {
        html +=
            `<img class="summit-hero__media" src="${esc(image.src)}" alt="${esc(image.alt)}"` +
                ` width="${esc(image.width)}" height="${esc(image.height)}" decoding="async"/>`;
    }
    return `${html}</section>`;
}
//# sourceMappingURL=html.js.map