import { parseArgs } from "node:util";
import { formatReport } from "./report.js";
import { runChecks } from "./run.js";
import { loadSite } from "./site.js";
import type { Mode } from "./types.js";

const USAGE = `usage: summit-checks <audit|gate> <dir> [options]

  audit   report only, always exits 0
  gate    exit 1 when any check reports an error

options:
  --base <path>            URL base the site is served under (default /)
  --mode <production|preview>   (default production)
  --allow-noindex <path>   page allowed to be noindex in production (repeatable)
  --ignore <prefix>        path prefix to skip (repeatable)
  --json                   print the full report as JSON`;

/** The checks CLI as a function, so `summit check` can delegate to it. Returns the exit code. */
export function main(argv: string[]): number {
  const { values, positionals } = parseArgs({
    args: argv,
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
    return values.help ? 0 : 2;
  }
  if (command === "monitor") {
    console.error("monitor mode (scheduled checks against a live URL) is not built yet; see SUMMIT-252");
    return 2;
  }
  if (command !== "audit" && command !== "gate") {
    console.error(`unknown command "${command}"\n\n${USAGE}`);
    return 2;
  }
  const mode = (values.mode ?? "production") as Mode;
  if (mode !== "production" && mode !== "preview") {
    console.error(`--mode must be production or preview, got "${mode}"`);
    return 2;
  }

  const options = {
    mode,
    ...(values.base ? { base: values.base } : {}),
    allowNoindex: values["allow-noindex"] ?? [],
    ignore: values.ignore ?? [],
  };
  const report = runChecks(loadSite(dir, options), options);
  console.log(values.json ? JSON.stringify(report, null, 2) : formatReport(report));
  return command === "gate" && report.errorCount > 0 ? 1 : 0;
}
