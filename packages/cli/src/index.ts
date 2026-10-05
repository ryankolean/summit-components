export {
  COMPONENT_CONFIG_SCHEMAS,
  designDoc,
  detectHost,
  detectStack,
  implementationDoc,
  initSiteConfig,
  recommendHost,
  recommendStack,
  validateSiteConfig,
  type DecideFinding,
  type Needs,
} from "./decide.js";
export { extractBrand, extractEntity, htmlPages, parseCss, resolveValue } from "./extract.js";
export { PRIVATE_MARKER, runIntake, type IntakeOptions, type IntakeResult } from "./intake.js";
export { executeNew, planNew, type NewOptions, type NewPlan, type Step } from "./new.js";
export { derivedContractValues, fillContract, mergeContractValues, type FilledContract } from "./contract.js";
export { buildEstimate, formatAmount, type Estimate, type EstimateLine } from "./estimate.js";
export { markdownToHtml } from "./markdown.js";
export {
  buildProposal,
  checkShareLinks,
  contractDocument,
  estimateDocument,
  proposalDocument,
  shareLinks,
  stageProposals,
  type BuildOptions,
  type BuildResult,
  type ShareLinks,
} from "./proposal.js";
export { renderPreview, styleGuideHtml } from "./preview.js";
export { verifySplit, type SplitFinding } from "./split.js";
