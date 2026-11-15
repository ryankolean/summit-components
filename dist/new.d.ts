export interface NewOptions {
    /** Repo name, kebab-case, e.g. "impeccable-cookie". */
    client: string;
    /** Intake directory from `summit intake`; its site/ facts seed the repo. */
    intake: string;
    /** Where to clone the new repo locally. */
    dest: string;
    owner?: string;
    visibility?: "private" | "public";
    /** Commit of this CLI's release tag. Resolved with `git ls-remote` when omitted. */
    cliCommit?: string;
}
export interface Step {
    describe: string;
    cmd: string[];
    cwd?: string;
    /** Request body for `gh api --input -`. */
    input?: string;
    /** A failure here is reported and the run continues (plan-gated features). */
    optional?: boolean;
}
export interface NewPlan {
    repo: string;
    steps: Step[];
    files: Record<string, string>;
}
/** The commit a tag names in `git ls-remote` output, peeling an annotated tag. */
export declare function tagCommit(lsRemote: string, tag: string): string | undefined;
/**
 * Release tags can move; commits cannot. Client CI installs the CLI by commit,
 * over HTTPS, because npm fetches `github:` specs over SSH and CI has no key.
 */
export declare function resolveCliCommit(version: string): string;
/** Everything `summit new` will do, without doing it. Tests and --dry-run read this. */
export declare function planNew(options: NewOptions): NewPlan;
/** Runs a plan. Seed files are written after the clone step. Returns per-step results. */
export declare function executeNew(plan: NewPlan, dest: string, log?: (line: string) => void): Array<{
    step: Step;
    ok: boolean;
    error?: string;
}>;
