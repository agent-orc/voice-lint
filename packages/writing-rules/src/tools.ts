import {
  composeWritingReviewPrompt, findWritingSignals, selectWritingRules, writingCatalogue,
  type WritingLanguage, type WritingProfileId,
} from './index.js';

/** Provider-neutral function metadata. A host adapts this to its provider's wire format. */
export interface WritingToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
}

const languages = ['en', 'de'] as const;
const profiles = ['public-docs', 'technical-reference', 'product-copy', 'agent-report'] as const;
const languageSchema = { type: 'string', enum: languages };
const profileSchema = { type: 'string', enum: profiles };
const selectionProperties = {
  profile: profileSchema,
  ruleIds: { type: 'array', items: { type: 'string', enum: writingCatalogue.rules.map(rule => rule.id) }, uniqueItems: true, minItems: 1, maxItems: writingCatalogue.rules.length },
};
const schema = (properties: Record<string, unknown>, required: readonly string[] = []) => ({
  type: 'object', properties, required, additionalProperties: false,
});
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const writingReviewTools: readonly WritingToolDescriptor[] = freeze([
  {
    name: 'get_writing_rules',
    description: 'List Voice rules, or retrieve full rule knowledge with prompts, examples, exceptions and evidence links. These are contextual review instructions, not verified findings.',
    inputSchema: schema({ ...selectionProperties, language: languageSchema, detail: { type: 'string', enum: ['summary', 'full'] } }),
  },
  {
    name: 'compose_writing_review_prompt',
    description: 'Compose review instructions locally using the host-defined audience and goal. Source text belongs in separate review material. This tool never runs a model.',
    inputSchema: schema({ ...selectionProperties, language: languageSchema, maxFindings: { type: 'integer', minimum: 1, maximum: 20 } }),
  },
  {
    name: 'find_writing_signals',
    description: 'Find published lexical cues with UTF-16 spans and explicit coverage. Quotes, code and negation are not excluded. Every cue needs contextual review; no matches is not a quality pass.',
    inputSchema: schema({ ...selectionProperties, language: languageSchema, text: { type: 'string', maxLength: 250000, description: 'At most 250000 UTF-16 code units; runtime enforces this additional bound.' }, maxSignals: { type: 'integer', minimum: 1, maximum: 500 } }, ['text']),
  },
  {
    name: 'get_model_comparison_evidence',
    description: 'Read host-supplied quality evidence for the exact language, profile, reviewer role and cohort. Returns qualified host selections or evidence-missing. Does not infer a ranking, select a route or run a model.',
    inputSchema: schema({ language: languageSchema, profile: profileSchema, role: { type: 'string', enum: ['reviewer'] }, cohortId: { type: 'string', minLength: 1, maxLength: 200 } }, ['language', 'profile', 'role', 'cohortId']),
  },
]);

export interface ModelComparisonQuery {
  readonly language: WritingLanguage;
  readonly profile: WritingProfileId;
  readonly role: 'reviewer';
  readonly cohortId: string;
}
export interface ModelComparisonContext {
  /** The host resolves and owns these IDs; tool arguments cannot configure them. */
  readonly availableModelIds: readonly string[];
  readonly cohortIds: readonly string[];
}
export interface ModelEvidenceSource {
  readonly id: string;
  /** A host-owned report path or URL, returned as data and never fetched here. */
  readonly location: string;
  readonly sha256: string;
}
export interface ModelEvidenceChoice {
  readonly modelId: string;
  readonly sourceIds: readonly string[];
  readonly independentJudgments: true;
  readonly sample: {
    readonly plannedReviews: number;
    readonly judgedReviews: number;
    readonly acceptedCompleteReviews: number;
  };
  readonly quality: {
    /** Independently judged issue counts; sparse fixture-label agreement is not sufficient. */
    readonly detectedProblems: number | null;
    readonly expectedProblems: number | null;
    readonly falseChanges: number | null;
  };
  /** Cost of all attempts, including errors/retries; unknown must remain null. */
  readonly totalCostUsd: number | null;
  readonly limitations: readonly string[];
}
export interface ModelComparisonEvidence {
  readonly status: 'available' | 'evidence-missing';
  readonly query: ModelComparisonQuery;
  readonly bestValue: ModelEvidenceChoice | null;
  readonly highestDetection: ModelEvidenceChoice | null;
  readonly sources: readonly ModelEvidenceSource[];
  /** Host's qualification criteria, or the reason a comparison is unavailable. */
  readonly explanation: string;
  readonly limitations: readonly string[];
}
export interface WritingToolHost {
  /** Trusted application context; never derived from a model's tool arguments. */
  readonly reviewContext?: { readonly audience: string; readonly goal: string };
  readonly modelComparisonContext?: ModelComparisonContext;
  /** Read-only contract: return retained evidence. Must not start inference, change routes or write state. */
  readonly getModelComparisonEvidence?: (
    query: ModelComparisonQuery, context: ModelComparisonContext,
  ) => ModelComparisonEvidence | Promise<ModelComparisonEvidence>;
}
export interface WritingToolCall { readonly name: string; readonly arguments: unknown }
export type WritingToolErrorCode = 'unknown-tool' | 'invalid-arguments' | 'context-missing' | 'invalid-host-evidence' | 'host-evidence-failed';
export type WritingToolResult =
  | { readonly ok: true; readonly tool: string; readonly data: unknown }
  | { readonly ok: false; readonly tool: string; readonly error: { readonly code: WritingToolErrorCode; readonly message: string } };

class ToolError extends Error {
  constructor(readonly code: WritingToolErrorCode, message: string) { super(message); }
}
const invalid = (message: string): never => { throw new ToolError('invalid-arguments', message); };
function object(value: unknown, keys: readonly string[], required: readonly string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('Arguments must be a JSON object.');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !keys.includes(key))) return invalid('Unexpected argument field.');
  if (required.some(key => !Object.hasOwn(record, key))) return invalid('Required argument field is missing.');
  return record;
}
function string(value: unknown, name: string, maximum = 4000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) return invalid(`${name} must be a nonempty string of at most ${maximum} UTF-16 units.`);
  return value;
}
function enumeration<T extends string>(value: unknown, choices: readonly T[], name: string): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) return invalid(`Unsupported ${name}.`);
  return value as T;
}
function optionalInteger(value: unknown, maximum: number, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > maximum) return invalid(`${name} must be an integer from 1 to ${maximum}.`);
  return value;
}
function selection(args: Record<string, unknown>) {
  const profile = args.profile === undefined ? undefined : enumeration(args.profile, profiles, 'profile');
  const language = args.language === undefined ? 'en' : enumeration(args.language, languages, 'language');
  let ruleIds: string[] | undefined;
  if (args.ruleIds !== undefined) {
    if (!Array.isArray(args.ruleIds) || !args.ruleIds.length || args.ruleIds.length > writingCatalogue.rules.length || args.ruleIds.some(id => typeof id !== 'string') || new Set(args.ruleIds).size !== args.ruleIds.length) return invalid('ruleIds must be a nonempty array of unique rule IDs.');
    ruleIds = [...args.ruleIds];
  }
  try { selectWritingRules({ profile, ruleIds }); } catch { return invalid('Unknown rule ID or rule outside the selected profile.'); }
  return { profile, ruleIds, language };
}
function count(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return invalid(`${name} must be a nonnegative safe integer.`);
  return value;
}
function strings(value: unknown, name: string, allowEmpty = true): string[] {
  if (!Array.isArray(value) || (!allowEmpty && !value.length)) return invalid(`${name} must be an array${allowEmpty ? '' : ' with at least one entry'}.`);
  const result = value.map(item => string(item, name));
  if (new Set(result).size !== result.length) return invalid(`${name} must contain unique entries.`);
  return result;
}

/** Validate only the contract and qualification fields, not the truth or optimality of host judgments. */
function validateEvidence(value: unknown, query: ModelComparisonQuery, context: ModelComparisonContext): ModelComparisonEvidence {
  const evidence = object(value, ['status', 'query', 'bestValue', 'highestDetection', 'sources', 'explanation', 'limitations'], ['status', 'query', 'bestValue', 'highestDetection', 'sources', 'explanation', 'limitations']);
  const actualQuery = object(evidence.query, ['language', 'profile', 'role', 'cohortId'], ['language', 'profile', 'role', 'cohortId']);
  for (const key of ['language', 'profile', 'role', 'cohortId'] as const) if (actualQuery[key] !== query[key]) invalid('Host evidence must match the exact requested scope.');
  enumeration(evidence.status, ['available', 'evidence-missing'], 'evidence status');
  string(evidence.explanation, 'explanation');
  strings(evidence.limitations, 'limitations');
  if (!Array.isArray(evidence.sources)) invalid('sources must be an array.');
  const sourceIds = new Set<string>();
  for (const entry of evidence.sources as unknown[]) {
    const source = object(entry, ['id', 'location', 'sha256'], ['id', 'location', 'sha256']);
    const id = string(source.id, 'source id', 200);
    if (sourceIds.has(id)) invalid('Source IDs must be unique.');
    sourceIds.add(id);
    string(source.location, 'source location');
    if (typeof source.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(source.sha256)) invalid('Source SHA-256 is required.');
  }
  for (const criterion of ['bestValue', 'highestDetection'] as const) {
    if (evidence[criterion] === null) continue;
    const choice = object(evidence[criterion], ['modelId', 'sourceIds', 'independentJudgments', 'sample', 'quality', 'totalCostUsd', 'limitations'], ['modelId', 'sourceIds', 'independentJudgments', 'sample', 'quality', 'totalCostUsd', 'limitations']);
    if (!context.availableModelIds.includes(string(choice.modelId, 'modelId', 200))) invalid('Evidence names a model outside the host context.');
    if (strings(choice.sourceIds, 'sourceIds', false).some(id => !sourceIds.has(id))) invalid('Choice references missing evidence sources.');
    if (choice.independentJudgments !== true) invalid('Model selections require independent judgments.');
    strings(choice.limitations, 'choice limitations');
    const sample = object(choice.sample, ['plannedReviews', 'judgedReviews', 'acceptedCompleteReviews'], ['plannedReviews', 'judgedReviews', 'acceptedCompleteReviews']);
    const planned = count(sample.plannedReviews, 'plannedReviews');
    const judged = count(sample.judgedReviews, 'judgedReviews');
    const accepted = count(sample.acceptedCompleteReviews, 'acceptedCompleteReviews');
    if (!judged || judged > planned || accepted > judged) invalid('Evidence needs a nonempty, consistent reviewed sample.');
    const quality = object(choice.quality, ['detectedProblems', 'expectedProblems', 'falseChanges'], ['detectedProblems', 'expectedProblems', 'falseChanges']);
    for (const key of ['detectedProblems', 'expectedProblems', 'falseChanges']) if (quality[key] !== null) count(quality[key], key);
    if ((quality.detectedProblems === null) !== (quality.expectedProblems === null)) invalid('Detection counts require both numerator and denominator.');
    if (typeof quality.detectedProblems === 'number' && typeof quality.expectedProblems === 'number' && quality.detectedProblems > quality.expectedProblems) invalid('Detected problems cannot exceed expected problems.');
    if (choice.totalCostUsd !== null && (typeof choice.totalCostUsd !== 'number' || !Number.isFinite(choice.totalCostUsd) || choice.totalCostUsd < 0)) invalid('Cost must be nonnegative or null.');
    if (criterion === 'bestValue' && (!accepted || choice.totalCostUsd === null)) invalid('Best-value evidence requires accepted complete reviews and known all-attempt cost.');
    if (criterion === 'highestDetection' && (!(typeof quality.expectedProblems === 'number' && quality.expectedProblems > 0) || quality.falseChanges === null)) invalid('Detection evidence requires independently judged problems and false-change counts.');
  }
  if (evidence.status === 'evidence-missing' && (evidence.bestValue !== null || evidence.highestDetection !== null)) invalid('Missing evidence cannot contain model selections.');
  if (evidence.status === 'available' && evidence.bestValue === null && evidence.highestDetection === null) invalid('Available evidence requires at least one supported selection.');
  return freeze(structuredClone(value)) as ModelComparisonEvidence;
}

/** Create a read-only tool boundary. The host, never a tool call, owns callbacks and configuration. */
export function createWritingToolDispatcher(host: WritingToolHost = {}) {
  const reviewContext = host.reviewContext ? freeze({ ...host.reviewContext }) : undefined;
  if (reviewContext) {
    string(reviewContext.audience, 'host audience');
    string(reviewContext.goal, 'host goal');
  }
  const evidenceCallback = host.getModelComparisonEvidence;
  const modelContext = host.modelComparisonContext ? freeze({
    availableModelIds: strings(host.modelComparisonContext.availableModelIds, 'availableModelIds'),
    cohortIds: strings(host.modelComparisonContext.cohortIds, 'cohortIds'),
  }) : undefined;
  const success = (tool: string, data: unknown): WritingToolResult => freeze({ ok: true, tool, data });
  return Object.freeze({
    async dispatch(call: WritingToolCall): Promise<WritingToolResult> {
      const name = typeof call?.name === 'string' ? call.name : '';
      try {
        if (!writingReviewTools.some(tool => tool.name === name)) throw new ToolError('unknown-tool', 'Unknown writing tool.');
        if (name === 'get_model_comparison_evidence') {
          const args = object(call.arguments, ['language', 'profile', 'role', 'cohortId'], ['language', 'profile', 'role', 'cohortId']);
          const query = freeze({ language: enumeration(args.language, languages, 'language'), profile: enumeration(args.profile, profiles, 'profile'), role: enumeration(args.role, ['reviewer'] as const, 'role'), cohortId: string(args.cohortId, 'cohortId', 200) });
          if (modelContext && !modelContext.cohortIds.includes(query.cohortId)) return invalid('Cohort is outside the host context.');
          if (!evidenceCallback || !modelContext || !modelContext.availableModelIds.length) return success(name, {
            status: 'evidence-missing', query, bestValue: null, highestDetection: null, sources: [],
            explanation: 'The host has not supplied comparison evidence for available models and this cohort.',
            limitations: ['No model ranking, routing decision or execution was performed.'],
          } satisfies ModelComparisonEvidence);
          let result: unknown;
          try { result = await evidenceCallback(query, modelContext); }
          catch { throw new ToolError('host-evidence-failed', 'The host evidence reader failed. No replacement or fallback ranking was used.'); }
          try { return success(name, validateEvidence(result, query, modelContext)); }
          catch { throw new ToolError('invalid-host-evidence', 'Host evidence is incomplete, inconsistent or outside the requested scope.'); }
        }
        const extraKeys = name === 'get_writing_rules' ? ['detail'] : name === 'compose_writing_review_prompt' ? ['maxFindings'] : ['text', 'maxSignals'];
        const args = object(call.arguments, ['profile', 'ruleIds', 'language', ...extraKeys], name === 'find_writing_signals' ? ['text'] : []);
        const selected = selection(args);
        if (name === 'get_writing_rules') {
          const detail = args.detail === undefined ? 'summary' : enumeration(args.detail, ['summary', 'full'] as const, 'detail');
          const rules = selectWritingRules(selected);
          const sourceIds = new Set(rules.flatMap(rule => rule.evidence.map(evidence => evidence.sourceId)));
          return success(name, { catalogueVersion: writingCatalogue.version, language: selected.language, detail,
            rules: detail === 'full' ? rules : rules.map(rule => ({ id: rule.id, category: rule.category, title: rule.title[selected.language], scope: rule.scope })),
            sources: detail === 'full' ? writingCatalogue.sources.filter(source => sourceIds.has(source.id)) : [],
          });
        }
        if (name === 'compose_writing_review_prompt') {
          const maxFindings = optionalInteger(args.maxFindings, 20, 'maxFindings');
          if (!reviewContext) throw new ToolError('context-missing', 'The host must supply the trusted review audience and goal.');
          return success(name, composeWritingReviewPrompt({ ...reviewContext, ...selected, maxFindings }));
        }
        if (typeof args.text !== 'string' || args.text.length > 250000) return invalid('text must be a string of at most 250000 UTF-16 units.');
        return success(name, findWritingSignals(args.text, { ...selected, maxSignals: optionalInteger(args.maxSignals, 500, 'maxSignals') }));
      } catch (error) {
        const failure = error instanceof ToolError ? error : new ToolError('invalid-arguments', 'Tool arguments could not be processed.');
        return freeze({ ok: false, tool: name, error: { code: failure.code, message: failure.message } });
      }
    },
  });
}
