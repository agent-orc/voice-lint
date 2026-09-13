# LLM tool use

`@voice/writing-rules/tools` exposes four read-only tools for an agent. The host
registers their JSON schemas with its model provider and dispatches returned tool
calls. The adapter retrieves rule knowledge, composes review instructions, scans
literal phrases, and reads quality evidence supplied by the host.

`@voice/writing-rules` supplies the analysis and review instructions.
`@voice/review` supplies HTML selection and finding visualization. An agent can
use the tools without a browser. A website can display findings supplied by any
compatible review engine.

## Register and dispatch tools

```ts
import {
  writingReviewTools,
  createWritingToolDispatcher,
  type WritingToolCall,
} from '@voice/writing-rules/tools';

const dispatcher = createWritingToolDispatcher({
  reviewContext: {
    audience: 'Developers reading the setup guide',
    goal: 'Open a project folder and complete the first review',
  },
});

// Adapt each { name, description, inputSchema } descriptor to the provider's
// tool format. The host owns registration, model execution and conversation.
const definitions = writingReviewTools;

// Example of an already decoded model tool call; no model is called here.
const call: WritingToolCall = {
  name: 'find_writing_signals',
  arguments: {
    text: 'A powerful review panel.',
    language: 'en',
    ruleIds: ['word-choice'],
  },
};
const result = await dispatcher.dispatch(call);
// The host can return JSON.stringify(result) as the provider's tool result.
```

Descriptors are provider-neutral JSON Schema objects, not provider SDK request
objects. The dispatcher accepts a decoded arguments object. It returns
`{ ok: true, tool, data }` or `{ ok: false, tool, error: { code, message } }`.
Unknown tools, extra fields, unsupported languages and invalid selections return
structured errors. There is no silent change to the requested coverage.

The host fixes the audience and goal when constructing the dispatcher. A tool
call cannot replace them, register a callback, configure an endpoint or execute
source text. Raw documents remain untrusted review material. The package has no
network, filesystem, credential, provider SDK or model-execution dependency.

## Tool inputs and results

| Tool | Inputs | Result |
| --- | --- | --- |
| `get_writing_rules` | Optional `profile`, `ruleIds`, `language`, `detail` | Concise rule list by default. `detail: "full"` returns complete rules, localized prompts/examples, exceptions and their catalogue evidence sources. |
| `compose_writing_review_prompt` | Optional `profile`, `ruleIds`, `language`, `maxFindings` | Canonical prompt text, selected rule IDs and catalogue version. Requires host audience/goal. Defaults to the six public-docs rules. |
| `find_writing_signals` | Required `text`; optional `profile`, `ruleIds`, `language`, `maxSignals` | Published regex candidates with quoted UTF-16 spans, scanned/unscanned rules and truncation status. |
| `get_model_comparison_evidence` | Required `language`, `profile`, `role: "reviewer"`, `cohortId` | Exact-scope evidence supplied by the host, or `evidence-missing`. |

Supported languages are `en` and `de`; omitted language defaults to English for
the first three tools. Profiles are `public-docs`, `technical-reference`,
`product-copy` and `agent-report`. Explicit rule IDs must belong to a selected
profile. Empty or duplicate ID arrays are rejected.

`maxFindings` accepts 1–20 and defaults to five. It requests a response format; it
does not constrain inference execution. `maxSignals` accepts 1–500 and defaults
to 50. Input text is limited to 250,000 UTF-16 code units. JSON Schema's string
length and JavaScript UTF-16 length can differ for supplementary characters;
runtime validation enforces the UTF-16 limit.

```ts
const knowledge = await dispatcher.dispatch({
  name: 'get_writing_rules',
  arguments: { ruleIds: ['reader-goal', 'word-choice'], detail: 'full' },
});

const instructions = await dispatcher.dispatch({
  name: 'compose_writing_review_prompt',
  arguments: { profile: 'public-docs', language: 'en', maxFindings: 3 },
});
```

Full knowledge returns bilingual catalogue records; `language` localizes summary
titles and selects the prompt/scanner language. The composer includes selected
instructions and conditional examples. It does not append research articles or
every catalogue metadata field. Adding an article to the website does not update
the package's rule knowledge automatically.

## Read model quality evidence

The host supplies available model IDs, allowed cohort IDs and a read-only evidence
callback. These values come from application configuration and the host's model
catalogue. The tool call supplies only the requested review scope.

```ts
import {
  createWritingToolDispatcher,
  type ModelComparisonEvidence,
} from '@voice/writing-rules/tools';

const evidenceTools = createWritingToolDispatcher({
  modelComparisonContext: {
    availableModelIds: ['model-id-resolved-by-the-host'],
    cohortIds: ['public-docs-held-out-v1'],
  },
  getModelComparisonEvidence: async (query, context) => {
    // A host can read retained, independently reviewed benchmark results here.
    // This example deliberately has no measured comparison to return.
    const result: ModelComparisonEvidence = {
      status: 'evidence-missing',
      query,
      bestValue: null,
      highestDetection: null,
      sources: [],
      explanation: 'No independently reviewed comparison is available for this scope.',
      limitations: [
        'The authored pilot and researched token prices do not qualify a model.',
      ],
    };
    return result;
  },
});

const evidence = await evidenceTools.dispatch({
  name: 'get_model_comparison_evidence',
  arguments: {
    language: 'en',
    profile: 'public-docs',
    role: 'reviewer',
    cohortId: 'public-docs-held-out-v1',
  },
});
```

The callback contract permits reading retained evidence. It must not start
inference, change a route, or write state. The library itself makes no such calls,
but it cannot sandbox arbitrary host callback code. Query and context snapshots
are frozen; later mutations of the host's input arrays do not change the dispatcher.

An available comparison provides `bestValue`, `highestDetection`, or both. Each
selection contains the host's model ID, source IDs, independent-judgment marker,
planned/judged/accepted complete-review counts, detection counts, false-change
counts, all-attempt cost and limitations. Source records carry a location and
SHA-256. Locations are returned as data and never fetched by this adapter.

- `bestValue` requires independently judged reviews, at least one accepted
  complete review, and known cost including failed/retried attempts.
- `highestDetection` requires independent issue-level judgments: detected and
  expected problem counts, plus false-change counts. Sparse fixture-label
  agreement cannot supply this evidence.
- Unknown measures remain `null`. A comparison can provide value evidence while
  leaving detection evidence unavailable.

The host explains its quality criteria and comparison limitations. It must use
matched scope, supported model settings and reproducible reports when making a
selection. The adapter validates structure, source references, available IDs,
counts and exact language/profile/role/cohort. It does not verify report contents
or compute an optimal model. A host may use existing Token Economy contracts for
model resolution and cost evidence; this package provides no replacement router.

Missing callbacks/context return `evidence-missing` with null selections. A failed
callback returns `host-evidence-failed`; a malformed or mismatched response returns
`invalid-host-evidence`. Neither path substitutes a different model or locale.

## Review results before using them

The static scanner recognizes eight rules through sixteen EN/DE regex records.
It does not exclude code, quotations or negation, and it does not assess meaning,
factual support, page structure or authorship. Every match requires review.

The prompt tool prepares instructions; the host decides whether to submit them
and validates any returned judgment. The host also maps source spans, preserves
author decisions and provides findings to `@voice/review` when HTML visualization
is needed. Tool execution alone never changes a document.

Run the local adapter contract tests with:

```sh
npm --prefix packages/writing-rules test
```

These tests dispatch synthetic tool calls and validate real catalogue, prompt and
regex results. Evidence fixtures exercise missing/invalid data and the read-only
boundary. They do not measure model quality, prices or execution latency.
