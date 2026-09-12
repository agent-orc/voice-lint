import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const options = {
  strict: true, noEmit: true, skipLibCheck: false,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
};
const normalize = filename => filename.replaceAll('\\', '/').toLowerCase();
const virtualFile = name => fileURLToPath(new URL(`./${name}.ts`, import.meta.url));
const format = diagnostics => ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCurrentDirectory: () => '', getCanonicalFileName: name => name, getNewLine: () => '\n',
});

function compile(source, name) {
  const filename = virtualFile(name);
  const host = ts.createCompilerHost(options);
  const originalSource = host.getSourceFile.bind(host);
  host.getSourceFile = (requested, languageVersion, ...rest) => normalize(requested) === normalize(filename)
    ? ts.createSourceFile(requested, source, languageVersion, true)
    : originalSource(requested, languageVersion, ...rest);
  const program = ts.createProgram([filename], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, format(diagnostics));
  assert(program.getSourceFiles().some(file => normalize(file.fileName).endsWith('/writing-rules/dist/tools.d.ts')), 'Consumer must use the distributed tools declarations.');
  assert(!program.getSourceFiles().some(file => normalize(file.fileName).endsWith('/writing-rules/src/tools.ts')), 'Consumer must not bypass exports by compiling source.');
  return { filename, program };
}

const consumer = `
import {
  writingReviewTools, createWritingToolDispatcher,
  type WritingToolDescriptor, type WritingToolCall, type WritingToolResult,
  type ModelComparisonQuery, type ModelComparisonContext,
  type ModelComparisonEvidence, type ModelEvidenceChoice,
} from '@voice/writing-rules/tools';

const descriptors: readonly WritingToolDescriptor[] = writingReviewTools;
const context: ModelComparisonContext = {
  availableModelIds: ['host-model'], cohortIds: ['held-out-en-docs'],
};
const query: ModelComparisonQuery = {
  language: 'en', profile: 'public-docs', role: 'reviewer', cohortId: 'held-out-en-docs',
};
const choice: ModelEvidenceChoice = {
  modelId: 'host-model', sourceIds: ['report'], independentJudgments: true,
  sample: { plannedReviews: 30, judgedReviews: 30, acceptedCompleteReviews: 24 },
  quality: { detectedProblems: null, expectedProblems: null, falseChanges: null },
  totalCostUsd: 1.25, limitations: ['Synthetic type fixture.'],
};
const dispatcher = createWritingToolDispatcher({
  reviewContext: { audience: 'Developers', goal: 'Complete the first review' },
  modelComparisonContext: context,
  getModelComparisonEvidence: async (query, context) => {
    const profile: 'public-docs' | 'technical-reference' | 'product-copy' | 'agent-report' = query.profile;
    const available: readonly string[] = context.availableModelIds;
    const report: ModelComparisonEvidence = {
      status: 'evidence-missing', query, bestValue: null, highestDetection: null,
      sources: [], explanation: 'No independently reviewed report is available.',
      limitations: ['A type fixture is not measured quality evidence.'],
    };
    void [profile, available];
    return report;
  },
});
const call: WritingToolCall = { name: 'get_model_comparison_evidence', arguments: query };
const pending: Promise<WritingToolResult> = dispatcher.dispatch(call);
const result = await pending;
if (!result.ok) {
  const code: 'unknown-tool' | 'invalid-arguments' | 'context-missing' | 'invalid-host-evidence' | 'host-evidence-failed' = result.error.code;
  const message: string = result.error.message;
  void [code, message];
} else {
  // Decoded tool arguments and result payloads cross an untrusted JSON boundary.
  const payload: unknown = result.data;
  void payload;
  // @ts-expect-error An error result cannot be assumed after success narrowing.
  result.error;
}
// @ts-expect-error Host goal is required when review context is supplied.
createWritingToolDispatcher({ reviewContext: { audience: 'Developers' } });
// @ts-expect-error Evidence query locale is a declared EN/DE union.
const unsupported: ModelComparisonQuery = { ...query, language: 'fr' };
// @ts-expect-error This adapter supports the reviewer role only.
const wrongRole: ModelComparisonQuery = { ...query, role: 'writer' };
// @ts-expect-error The host context is readonly.
context.availableModelIds.push('another-model');
// @ts-expect-error Descriptors are readonly.
descriptors[0].name = 'execute';
// @ts-expect-error A host selection must explicitly assert independent judgments.
const unqualified: ModelEvidenceChoice = { ...choice, independentJudgments: false };
// @ts-expect-error Unknown cost is null; an arbitrary string is not a cost.
const malformedCost: ModelEvidenceChoice = { ...choice, totalCostUsd: 'unknown' };
// @ts-expect-error A callback must return the structured evidence contract.
createWritingToolDispatcher({ getModelComparisonEvidence: () => 'use the cheapest model' });
void [descriptors, choice, unsupported, wrongRole, unqualified, malformedCost];
`;

test('tools subpath declarations type-check a strict NodeNext consumer and reject invalid host contracts', () => {
  const { filename } = compile(consumer, 'writing-tools-consumer');
  const resolution = ts.resolveModuleName('@voice/writing-rules/tools', filename, options, ts.sys).resolvedModule;
  assert(resolution, 'Public package subpath must resolve.');
  assert(normalize(resolution.resolvedFileName).endsWith('/writing-rules/dist/tools.d.ts'));
});

test('TypeScript language service offers inferred query and context completions from distributed tools declarations', () => {
  const filename = virtualFile('writing-tools-intellisense');
  const service = ts.createLanguageService({
    getCompilationSettings: () => options,
    getScriptFileNames: () => [filename],
    getScriptVersion: () => '1',
    getScriptSnapshot: requested => {
      if (normalize(requested) === normalize(filename)) return ts.ScriptSnapshot.fromString(consumer);
      const content = ts.sys.readFile(requested);
      return content === undefined ? undefined : ts.ScriptSnapshot.fromString(content);
    },
    getCurrentDirectory: () => fileURLToPath(new URL('../', import.meta.url)),
    getDefaultLibFileName: settings => ts.getDefaultLibFilePath(settings),
    fileExists: requested => normalize(requested) === normalize(filename) || ts.sys.fileExists(requested),
    readFile: requested => normalize(requested) === normalize(filename) ? consumer : ts.sys.readFile(requested),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath,
  });
  try {
    for (const [expression, expected] of [
      ['query.profile', ['language', 'profile', 'role', 'cohortId']],
      ['context.availableModelIds', ['availableModelIds', 'cohortIds']],
    ]) {
      const position = consumer.indexOf(expression) + expression.indexOf('.') + 1;
      const completions = service.getCompletionsAtPosition(filename, position, {});
      const names = new Set(completions?.entries.map(entry => entry.name) ?? []);
      for (const name of expected) assert(names.has(name), `${expression} must offer ${name}.`);
      assert(!names.has('endpoint'), 'Host evidence context must not suggest a model-owned endpoint.');
    }
  } finally { service.dispose(); }
});

test('TOOLS.md TypeScript registration, dispatch and evidence examples compile as consumers', () => {
  const markdown = readFileSync(new URL('../TOOLS.md', import.meta.url), 'utf8');
  const blocks = [...markdown.matchAll(/```ts\r?\n([\s\S]*?)```/g)].map(match => match[1]);
  assert.equal(blocks.length, 3, 'Update this check when runnable documentation examples change.');
  // The second snippet intentionally reuses the dispatcher introduced in the first.
  compile(blocks[0] + '\n' + blocks[1], 'writing-tools-guide-dispatch');
  compile(blocks[2], 'writing-tools-guide-evidence');
});
