export interface NewOptions {
    /** Repo name, kebab-case, e.g. "impeccable-cookie". */
    client: string;
    /** Intake directory from `summit intake`; its site/ facts seed the repo. */
    intake: string;
    /** Where to clone the new repo locally. */
    dest: string;
    owner?: string;
    visibility?: "private" | "public";
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
/** Everything `summit new` will do, without doing it. Tests and --dry-run read this. */
export declare function planNew(options: NewOptions): NewPlan;
/** Runs a plan. Seed files are written after the clone step. Returns per-step results. */
export declare function executeNew(plan: NewPlan, dest: string, log?: (line: string) => void): Array<{
    step: Step;
    ok: boolean;
    error?: string;
}>;
