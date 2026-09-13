# Review benchmarks

Compare models and prompt strategies using independently reviewed results. Report
whether the review preserves facts and intent, makes justified decisions and
misses relevant issues. Cost is a separate measurement: a result can be evaluated
when its provider usage or invoice cost is unavailable.

The offline evaluator accepts recorded model responses and human judgments. It
does not call a model, launch an agent or select a production model. The included
30 EN/DE cases are authored development examples. They help test the evaluation
method; they are not a representative or held-out quality benchmark.

## Prepare and freeze the inputs

Run these commands from the Voice Studio project root:

```sh
npm run build:writing-rules
node benchmarks/writing-review/prepare-model-comparison.mjs
node benchmarks/writing-review/verify-model-comparison.mjs
node benchmarks/writing-review/evaluate-model-quality.mjs \
  --manifest test-results/writing-review/model-experiment.json \
  --init \
  --output test-results/writing-review/quality-run.json
```

The last command creates an inert run template. It records the **exact manifest
file hash**, evaluator hash, catalogue version and original fixture, Library,
research and preparer hashes. Its condition, attempt and review arrays start
empty. Creating the template sends no requests.

```text
benchmarks/writing-review/           maintained method and code
├── fixtures.json                    authored cases and reviewer-only labels
├── prepare-model-comparison.mjs     canonical requests and experiment manifest
├── evaluate-model-quality.mjs       response validation and offline evaluation
├── verify-model-quality.mjs         synthetic contract tests
└── quality-evaluation.md            evaluation method

test-results/writing-review/         generated records; ignored by Git
├── model-experiment.json            frozen prompts, sources and planned options
├── quality-run.json                 selected conditions, attempts and judgments
└── quality-report.json              deterministic evaluation of those inputs
```

Keep a copy of the manifest, run file and source revision with any published
result. Do not rerun preparation over a manifest that already identifies a model
run. A changed rule, source, model setting or evaluator requires a new recorded
experiment or an explicitly separate re-evaluation. The evaluator rejects a
manifest whose exact bytes differ, even if only its formatting changed.

## Record the comparison before generating answers

Each condition selects one frozen coverage cohort and prompt strategy, exact
source IDs and repetition numbers. Conditions also record requested and returned
model IDs, provider parameters and execution settings. Resolve the model through
the host; the researched candidate names are not a routing catalogue.

The condition contract is:

```json
{
  "conditionId": "profile-bundle-cold",
  "candidateId": "openai-luna",
  "cohortId": "public-docs-six",
  "strategyId": "bundled",
  "sourceIds": ["source-001", "source-002"],
  "repetitions": [1, 2],
  "provider": "recorded-provider-name",
  "requestedModelId": "recorded-requested-model-id",
  "effectiveModelId": "recorded-returned-model-version",
  "parameters": {"max_output_tokens": 1000},
  "parametersSha256": "SHA-256 of JSON.stringify(parameters)",
  "executionSettings": {
    "adapterVersion": "recorded-adapter-version",
    "runtimeVersion": "recorded-runtime-version",
    "reasoning": null,
    "maxOutputTokens": 1000,
    "concurrency": 1,
    "retryPolicy": {"maximumAttempts": 2},
    "cacheMode": "cold",
    "ordering": "counterbalanced",
    "orderSeed": "recorded-seed",
    "providerBatch": false
  }
}
```

This is a field example for the template's `conditions` array. Replace descriptive
values with actual recorded settings and hashes before evaluation. Obtain hashes
with the exported `sha256` function from `prepare-model-comparison.mjs`. Copy
source IDs, candidate IDs, strategies and coverage from the frozen manifest.
`reasoning: null` records no supplied reasoning setting; it does not mean that
the model used zero reasoning tokens.

Keep the same source selection and repetitions across compared models and prompt
strategies. Six-rule and twenty-rule coverage remain separate. English and German
results remain separate. Randomize or counterbalance generation order and record
the procedure. Treat cold cache, warm cache, provider Batch and changed parameters
as separate conditions. A different model on retry requires a separately declared
condition; this evaluator does not combine undeclared escalation routes.

## Save every attempt

An attempt belongs to a planned review, identified as
`conditionId/sourceId/r<repetition>`, and one frozen request. Keep failures and
retries alongside successful responses. Each attempt has one globally unique ID.

```json
{
  "attemptId": "attempt-001",
  "reviewRunId": "profile-bundle-cold/source-001/r1",
  "requestId": "source-001/public-docs-six/bundled/all",
  "sequence": 1,
  "retryOf": null,
  "requestedModelId": "recorded-requested-model-id",
  "effectiveModelId": "recorded-returned-model-version",
  "parametersSha256": "copy the condition parameter hash",
  "payloadSha256": "copy the frozen request payload hash",
  "canonicalPromptSha256": "copy the frozen canonical prompt hash",
  "sourceSha256": "copy the frozen source hash",
  "status": "response",
  "response": "the exact raw JSON response text",
  "error": null,
  "actualCostUsd": null,
  "usage": null,
  "latencyMs": null
}
```

The attempt example shows the full field contract; descriptive strings stand in
for recorded values. `response` accepts raw JSON text or a parsed JSON object.
Preserve the raw text when available, including invalid JSON. The evaluator calls
`validateModelResponse` on each supplied response. Invalid JSON, missing rules,
stale sources, inaccurate quoted spans and unsupported result shapes count as
failed responses; they do not disappear from the report.

Other attempt statuses are `error`, `cancelled` and `not-completed`. Their
`response` is `null`. An attempt that received no model response can also have a
null effective model ID. A retry references its predecessor with `retryOf` and
increments `sequence`; changing source, prompt, parameters or model inside that
condition is rejected.

When usage is available, `usage` contains all five nullable count fields:
`inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens` and
`reasoningTokens`. Missing usage stays null. Enter actual cost from the host's
recorded accounting; the evaluator does not turn research price estimates into
invoices. No local cost or token estimate fills an unknown value.

## Judge the complete response set

Select exactly which final attempt supplies each request's answer **before human
grading**. An accepted complete review needs a valid answer for every request in
its selected rule scope. Keep unselected attempts in the run so their cost and
failure rates remain visible.

Create a `reviews` entry with `reviewRunId`, `finalAttemptIds`, `humanJudgments`
and `adjudication`. Use `responseSetSha256(finalAttemptIds, attempts)`, exported by
the evaluator, to bind each human judgment to those exact selected responses. A
later change to a response or selection invalidates its earlier judgments.

A human judgment has this shape:

```json
{
  "reviewerId": "editor-01",
  "method": "independent-human-review",
  "responseSetSha256": "hash returned by responseSetSha256",
  "alternativeScope": "all-produced-alternatives",
  "factsPreserved": null,
  "intentPreserved": null,
  "harmfulChange": null,
  "ruleJudgments": [
    {
      "ruleId": "reader-goal",
      "decisionJustified": null,
      "missedIssueCount": null,
      "rationale": null
    }
  ],
  "rationale": null
}
```

The rule entry is abbreviated: include exactly one judgment for **every selected
rule**, using the frozen review's `ruleIds`. Null means unassessed. Reviewers
replace null values only after checking the original source, supplied context,
decisions and **all one to three proposed alternatives**. An unsafe alternative
still counts when another alternative is usable. Assessed rules and completed
reviews require written rationales.

Review these questions independently of the authored diagnostic labels and model
name:

| Judgment | What the reviewer assesses |
| --- | --- |
| Facts preserved | Do every proposed alternative and the stated reasons preserve supported facts without adding unsupported claims? |
| Intent preserved | Does the review preserve the source's purpose, audience and intended meaning? |
| Decision justified | Is keeping, changing or requesting evidence warranted for this rule and context? |
| Missed issues | How many relevant issues under this selected rule did the answer leave unaddressed? |
| Harmful change | Could any proposed alternative damage factual accuracy, intent or the reader's ability to act? |

A justified `keep` can be an accepted complete review. A justified
`needs-evidence` can have accepted editorial quality while the review remains
incomplete. For example, a model should request missing current paths instead of
inventing them while replacing an internal cleanup story.

Preserve each reviewer's record. Differing resolved judgments remain visible as
disagreement. Until resolved they cannot accept a review. A separate adjudicator
can supply the same judgment contract in `adjudication`; the original judgments
and disagreement count remain in the result. A single complete human review is
supported by the contract; it does not establish independent reviewer agreement.

The evaluator derives acceptance from complete, resolved human judgments:
preserved facts and intent, justified decisions, no missed issue in the selected
scope and no harmful alternative. Matching a fixture label cannot supply a
missing human judgment. The report exposes these dimensions separately and
produces no overall writing-quality score.

## Evaluate and replay

After recording responses and judgments:

```sh
node benchmarks/writing-review/evaluate-model-quality.mjs \
  --manifest test-results/writing-review/model-experiment.json \
  --run test-results/writing-review/quality-run.json \
  --output test-results/writing-review/quality-report.json

node --test benchmarks/writing-review/verify-model-quality.mjs
```

The evaluator never rebuilds the manifest. It checks the manifest byte hash,
original provenance, evaluator version and code hash, response-validator revision,
prompt and source hashes, exact model identities and condition parameter hashes.
It refuses to overwrite input files or an existing report. For a replay, choose
a new output filename and use the same input files and recorded code revision.
The resulting report is identical for those fixed inputs; it contains no current
timestamp.

Replaying evaluation is different from generating new model responses. A new
model run can vary even with the same request and settings. Record it as a new
run or repetition, retain its outputs and compare the distribution of results.
Reusing one old answer under another repetition is not independent evidence.

The test suite uses explicitly labelled synthetic responses and reviewer records
to verify the evaluator. Passing those tests establishes contract behavior,
including failure handling; it measures no model's editorial quality.

## Read quality and cost separately

Each condition and language report retains the planned denominator, including
missing, invalid, incomplete, unassessed, disputed and rejected reviews. It reports
accepted editorial reviews separately from accepted **complete** reviews, plus
fact and intent preservation, harmful changes and rule-level human judgments.

The diagnostic section compares predictions with sparse authored fixture labels:
an exact selected rule ID, exact quote and unambiguous UTF-16 span must match.
There is no overlap or fuzzy matching. A broader but useful quote can fail that
diagnostic while receiving a positive human assessment. Unlabelled rules are not
automatically correct keep decisions. Out-of-scope labels do not enter recall.
The report includes matched, predicted and expected counts alongside diagnostic
precision and recall; an empty denominator produces null.

Cost per accepted complete review divides the cost of **all supplied attempts**
by the accepted complete-review count. Errors, invalid responses, unselected
attempts and retries count once each. Any unknown attempt cost makes total cost
and that ratio unknown; zero accepted complete reviews also produces a null
ratio. Known partial cost remains visible. Quality can still be compared when
cost is unknown.

Compare only matching source sets, repetitions, coverage and declared execution
conditions. Do not choose a production model from the sparse fixture diagnostics.
Use held-out product documents, independently reviewed issue labels and repeated
conditions to establish what a model detects and preserves in actual use. The
current evaluator reports evidence; the host supplies any explicit model-selection
policy.
