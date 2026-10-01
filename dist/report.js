/** Scorecard for a terminal or a PR comment. Shows the first few findings per check. */
export function formatReport(report, { limit = 5 } = {}) {
    const lines = [];
    const passing = report.checks.filter((c) => c.status === "pass").length;
    lines.push(`${report.root}  (mode: ${report.mode}, base: ${report.base}, ${report.pageCount} pages)`);
    lines.push("");
    const width = Math.max(...report.checks.map((c) => c.id.length));
    for (const c of report.checks) {
        lines.push(`  ${c.id.padEnd(width)}  ${c.status.padEnd(4)}  ${String(c.errors).padStart(4)} errors  ${String(c.warnings).padStart(4)} warnings`);
    }
    for (const c of report.checks.filter((r) => r.status !== "pass")) {
        const mine = report.findings.filter((f) => f.check === c.id);
        lines.push("", `${c.id}: ${c.description}`);
        for (const f of mine.slice(0, limit)) {
            lines.push(`  [${f.severity}] ${f.page ? `${f.page}  ` : ""}${f.message}`);
        }
        if (mine.length > limit)
            lines.push(`  ... ${mine.length - limit} more`);
    }
    lines.push("", `score: ${passing}/${report.checks.length} checks passing, ${report.errorCount} errors, ${report.warningCount} warnings`);
    return lines.join("\n");
}
//# sourceMappingURL=report.js.map