import type { HTMLElement } from "node-html-parser";
export type Mode = "production" | "preview";
export type Severity = "error" | "warn";
export interface RunOptions {
    /** URL base the site is served under, e.g. "/4pm-detroit/". Defaults to "/". */
    base?: string;
    /** production expects the site open to crawlers; preview expects it closed. */
    mode?: Mode;
    /** Page paths or files allowed to be noindex in production, e.g. "/styleguide.html". */
    allowNoindex?: string[];
    /** Path prefixes to skip, relative to the root, e.g. "design-catalog/". */
    ignore?: string[];
}
export interface Page {
    /** Path relative to the site root, e.g. "menu/index.html". */
    file: string;
    /** URL path on the host, including the base, e.g. "/site/menu/". */
    urlPath: string;
    root: HTMLElement;
    noindex: boolean;
    is404: boolean;
}
export interface Site {
    root: string;
    base: string;
    pages: Page[];
    /** Every file under the root, relative, with forward slashes. */
    files: Set<string>;
    readText(file: string): string | undefined;
}
export interface Finding {
    check: string;
    severity: Severity;
    message: string;
    page?: string;
}
export interface Check {
    id: string;
    description: string;
    run(site: Site, options: Required<Pick<RunOptions, "mode" | "allowNoindex">>): Finding[];
}
export interface CheckResult {
    id: string;
    description: string;
    status: "pass" | "warn" | "fail";
    errors: number;
    warnings: number;
}
export interface Report {
    root: string;
    base: string;
    mode: Mode;
    pageCount: number;
    checks: CheckResult[];
    findings: Finding[];
    errorCount: number;
    warningCount: number;
}
