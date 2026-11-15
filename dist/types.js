const SAFE_HREF = /^(?:https?:|mailto:|tel:|\/|#|\.{0,2}\/|[^:]*$)/i;
export function isSafeHref(href) {
    return SAFE_HREF.test(href.trim());
}
export function assertSafeHref(href) {
    if (!isSafeHref(href))
        throw new Error(`unsafe href: ${href}`);
    return href;
}
//# sourceMappingURL=types.js.map