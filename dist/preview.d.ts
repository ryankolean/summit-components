/**
 * A stack-neutral preview built from site/*.json alone, so a new client repo
 * deploys something real before Decisions picks a stack. Always noindex.
 */
export declare function renderPreview(repo: string, out: string): void;
