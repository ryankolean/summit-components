export interface SplitFinding {
    file: string;
    message: string;
}
/**
 * Proves a site repo holds public facts only: no file carries the private
 * intake marker or a private intake filename, and site/entity.json validates
 * with no keys outside the schema (an unknown key is where private notes hide).
 */
export declare function verifySplit(repo: string): SplitFinding[];
