#!/usr/bin/env node
import { parseArgs } from "node:util";
import { formatReport } from "./report.js";
import { runChecks } from "./run.js";
import { loadSite } from "./site.js";
const USAGE = `usage: summit-checks <audit|gate> <dir> [options]

  audit   report only, always exits 0
  gate    exit 1 when any check reports an error

options:
  --base <path>            URL base the site is served under (default /)
  --mode <production|preview>   (default production)
  --allow-noindex <path>   page allowed to be noindex in production (repeatable)
  --ignore <prefix>        path prefix to skip (repeatable)
  --json                   print the full report as JSON`;
const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        base: { type: "string" },
        mode: { type: "string" },
        "allow-noindex": { type: "string", multiple: true },
        ignore: { type: "string", multiple: true },
        json: { type: "boolean" },
        help: { type: "boolean", short: "h" },
    },
});
const [command, dir] = positionals;
if (values.help || !command || !dir) {
    console.log(USAGE);
    process.exit(values.help ? 0 : 2);
}
if (command === "monitor") {
    console.error("monitor mode (scheduled checks against a live URL) is not built yet; see SUMMIT-252");
    process.exit(2);
}
if (command !== "audit" && command !== "gate") {
    console.error(`unknown command "${command}"\n\n${USAGE}`);
    process.exit(2);
}
const mode = (values.mode ?? "production");
if (mode !== "production" && mode !== "preview") {
    console.error(`--mode must be production or preview, got "${mode}"`);
    process.exit(2);
}
const options = {
    mode,
    ...(values.base ? { base: values.base } : {}),
    allowNoindex: values["allow-noindex"] ?? [],
    ignore: values.ignore ?? [],
};
const report = runChecks(loadSite(dir, options), options);
console.log(values.json ? JSON.stringify(report, null, 2) : formatReport(report));
process.exit(command === "gate" && report.errorCount > 0 ? 1 : 0);
//# sourceMappingURL=cli.js.map