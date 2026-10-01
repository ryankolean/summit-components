import { ALL_CHECKS } from "./checks.js";
export function runChecks(site, options = {}, checks = ALL_CHECKS) {
    const mode = options.mode ?? "production";
    const allowNoindex = options.allowNoindex ?? [];
    const findings = checks.flatMap((check) => check.run(site, { mode, allowNoindex }));
    const results = checks.map((check) => {
        const mine = findings.filter((f) => f.check === check.id);
        const errors = mine.filter((f) => f.severity === "error").length;
        const warnings = mine.length - errors;
        return {
            id: check.id,
            description: check.description,
            status: errors ? "fail" : warnings ? "warn" : "pass",
            errors,
            warnings,
        };
    });
    const errorCount = findings.filter((f) => f.severity === "error").length;
    return {
        root: site.root,
        base: site.base,
        mode,
        pageCount: site.pages.length,
        checks: results,
        findings,
        errorCount,
        warningCount: findings.length - errorCount,
    };
}
//# sourceMappingURL=run.js.map