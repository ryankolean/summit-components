import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { assertSafeHref } from "./types.js";
function Cta({ link, variant }) {
    return (_jsx("a", { className: `summit-hero__cta summit-hero__cta--${variant}`, href: assertSafeHref(link.href), children: link.label }));
}
function Media({ image }) {
    const img = (_jsx("img", { className: "summit-hero__media", src: image.src, srcSet: image.srcset, sizes: image.sizes, alt: image.alt, width: image.width, height: image.height, decoding: "async", fetchPriority: image.fetchpriority }));
    if (!image.sources?.length)
        return img;
    return (_jsxs("picture", { className: "summit-hero__picture", children: [image.sources.map((s) => (_jsx("source", { type: s.type, srcSet: s.srcset, sizes: s.sizes ?? image.sizes }, `${s.type} ${s.srcset}`))), img] }));
}
/**
 * Server-rendered hero with no client JavaScript. Its markup must stay identical
 * to renderHero(); test/hero.test.tsx enforces that.
 */
export function Hero(props) {
    const { id = "hero", headingLevel = 1, align = "start", layout = "split", eyebrow, title, lede, image } = props;
    const Heading = headingLevel === 2 ? "h2" : "h1";
    const classes = ["summit-hero", `summit-hero--${align}`];
    if (image)
        classes.push("summit-hero--with-media");
    if (layout === "stacked")
        classes.push("summit-hero--stacked");
    return (_jsxs("section", { className: classes.join(" "), "aria-labelledby": `${id}-title`, children: [_jsxs("div", { className: "summit-hero__body", children: [eyebrow && _jsx("p", { className: "summit-hero__eyebrow", children: eyebrow }), _jsx(Heading, { id: `${id}-title`, className: "summit-hero__title", children: title }), lede && _jsx("p", { className: "summit-hero__lede", children: lede }), (props.primaryCta || props.secondaryCta) && (_jsxs("div", { className: "summit-hero__actions", children: [props.primaryCta && _jsx(Cta, { link: props.primaryCta, variant: "primary" }), props.secondaryCta && _jsx(Cta, { link: props.secondaryCta, variant: "secondary" })] }))] }), image && _jsx(Media, { image: image })] }));
}
//# sourceMappingURL=Hero.js.map