# Experimental AI-origin signal contract

Status: **proposed 0.x design contract, not implemented**

This document defines the intended public safety and result contract for a possible future Voice Lint AI-origin module. No detector backend, calibration, risk band, or AI-origin capability is implemented by the current repository.

The module is deliberately separate from writing-quality analysis:

> An AI-origin signal is uncertain post-hoc evidence about a text pattern. It is not proof of who or what wrote the text.

## 0.x safety invariants

- The module is experimental, optional, and disabled by default.
- It runs only when both the current invocation explicitly requests it and a
  trusted local runtime configuration selects an eligible backend.
- It never changes a quality dimension, `quality_score`, `slop_risk`, finding severity, policy status, analysis status, SARIF level, or CLI exit code.
- It can never be a CI quality gate in any 0.x release. There is no unsafe override.
- In a detected CI environment, 0.x does not execute the detector and returns `not_run` with `disabled_in_ci_0x`.
- It never returns a definitive human or AI authorship verdict.
- The stable public `AIOriginSignal` never exposes a field named `probability_ai`, `is_ai`, `human_score`, or equivalent.
- `low` does not mean human-authored. `high` does not prove AI generation.
- A risk band is available only with a matching, published calibration. Otherwise the module abstains.
- Editing, paraphrasing, translation, mixed authorship, model drift, domain shift, and short input can require abstention.
- High-stakes academic, employment, compliance, disciplinary, moderation, or eligibility decisions are outside supported use.
- Process provenance, revision history, or signed generation metadata is reported separately and must not be collapsed into this surface-text signal.
- The first 0.x detector runs only as a pinned local child under
  `strict_offline`; it opens no socket and performs no runtime model download.
- Cloud detector APIs are outside the 0.x contract. A later cloud design needs
  an explicit recipient, consent, billing, retention, and threat-model review.

## 0.x execution boundary

A detector artifact is bundled only after license review or selected from a
trusted user installation with an integrity-pinned model revision. Analysis
fails closed if it would download code or weights, resolve a hostname, or open
a socket. Every executed result reports the effective local deployment scope,
data path, recipient, and network/download observations.

## Canonical enums

### Status

```text
not_run | unsupported | insufficient_evidence | available | failed
```

| Value | Meaning |
|---|---|
| `not_run` | The module was not requested, is disabled, or no backend was selected. |
| `unsupported` | No backend and calibration support the detected language, domain, format, or required length bucket. |
| `insufficient_evidence` | A backend could run, but the input or detector agreement does not support a responsible risk band. |
| `available` | All required gates passed and a matching calibration produced a risk band. |
| `failed` | Execution, timeout, model loading, or result validation failed. |

Only `available` permits a non-null `risk_band`.

### Risk band

```text
low | medium | high
```

Risk bands are calibration-specific ordinal labels, not probabilities. Their thresholds must be published in the referenced calibration card. Bands from different detectors, languages, domains, length buckets, or calibration versions are not comparable.

### Evidence quality

```text
none | insufficient | calibrated_in_domain
```

| Value | Permitted status |
|---|---|
| `none` | `not_run`, `unsupported`, or `failed` |
| `insufficient` | `insufficient_evidence` |
| `calibrated_in_domain` | `available` |

There is intentionally no generic `high_confidence` value.

### Reason codes

The proposed stable reason-code vocabulary is:

```text
not_requested
disabled_by_default
disabled_in_ci_0x
backend_not_configured
backend_unavailable
backend_failed
result_validation_failed
language_unsupported
domain_unsupported
domain_unknown
format_unsupported
text_too_short
calibration_missing
calibration_mismatch
out_of_distribution
mixed_authorship_suspected
edited_or_paraphrased_suspected
translated_text_suspected
detector_disagreement
insufficient_usable_text
```

```typescript
type AIOriginReasonCode =
  | "not_requested"
  | "disabled_by_default"
  | "disabled_in_ci_0x"
  | "backend_not_configured"
  | "backend_unavailable"
  | "backend_failed"
  | "result_validation_failed"
  | "language_unsupported"
  | "domain_unsupported"
  | "domain_unknown"
  | "format_unsupported"
  | "text_too_short"
  | "calibration_missing"
  | "calibration_mismatch"
  | "out_of_distribution"
  | "mixed_authorship_suspected"
  | "edited_or_paraphrased_suspected"
  | "translated_text_suspected"
  | "detector_disagreement"
  | "insufficient_usable_text";
```

Reason codes describe why the module abstained or failed. They do not claim that Voice Lint can reliably identify editing, translation, or mixed authorship; those codes may originate from known metadata, explicit user input, or conservative detector disagreement.

### Limitation codes

Every `available` result includes applicable limitation codes. The minimum vocabulary is:

```text
result_is_not_proof_of_authorship
false_positives_and_false_negatives_are_expected
shorter_text_reduces_reliability
paraphrasing_can_change_the_result
editing_can_change_the_result
translation_can_change_the_result
mixed_authorship_may_not_be_detected
results_depend_on_language_and_domain
results_depend_on_generator_and_decoding
model_and_data_drift_can_invalidate_calibration
non_native_writing_requires_separate_evaluation
not_for_high_stakes_decisions
```

```typescript
type AIOriginLimitationCode =
  | "result_is_not_proof_of_authorship"
  | "false_positives_and_false_negatives_are_expected"
  | "shorter_text_reduces_reliability"
  | "paraphrasing_can_change_the_result"
  | "editing_can_change_the_result"
  | "translation_can_change_the_result"
  | "mixed_authorship_may_not_be_detected"
  | "results_depend_on_language_and_domain"
  | "results_depend_on_generator_and_decoding"
  | "model_and_data_drift_can_invalidate_calibration"
  | "non_native_writing_requires_separate_evaluation"
  | "not_for_high_stakes_decisions";

type AIOriginErrorCategory =
  | "backend_unavailable"
  | "execution_failed"
  | "timeout"
  | "model_load_failed"
  | "invalid_backend_result";
```

## Proposed public object

The 0.x JSON-compatible shape is:

```typescript
interface AIOriginSignal {
  contract_version: "0.x";
  experimental: true;
  status:
    | "not_run"
    | "unsupported"
    | "insufficient_evidence"
    | "available"
    | "failed";
  risk_band: "low" | "medium" | "high" | null;
  evidence_quality: "none" | "insufficient" | "calibrated_in_domain";
  error_category: AIOriginErrorCategory | null;
  reason_codes: AIOriginReasonCode[];
  limitations: AIOriginLimitationCode[];
  language: string | null;
  domain_id: string | null;
  characters_evaluated: number;
  tokens_evaluated: number | null;
  tokenizer_id: string | null;
  min_tokens_required: number | null;
  detector: {
    id: string;
    version: string;
    model_revision: string;
    model_card_url: string;
    model_card_sha256: string;
  } | null;
  calibration: {
    id: string;
    version: string;
    language: string;
    domain_id: string;
    length_bucket: string;
    target_false_positive_rate: number;
    calibration_artifact_digest: string;
    evaluated_at: string;
    evaluation_card_url: string;
    evaluation_card_sha256: string;
  } | null;
  execution_provenance: {
    runtime_mode: "strict_offline";
    deployment_scope: "local_process";
    data_path: "on_device";
    recipient_id: "local_device";
    backend_id: string;
    backend_version: string;
    backend_artifact_digest: string;
    model_revision: string;
    model_artifact_digest: string;
    artifact_verification: "verified";
    network_used: false;
    runtime_download_used: false;
  } | null;
}
```

The eventual JSON Schema must use closed enums and reject unknown status or band values. Additional metadata may be added compatibly, but the invariants below cannot be weakened within 0.x.

## Field invariants

For every status other than `not_run`, `execution_provenance` is non-null if
and only if backend execution began. A pre-execution unsupported or failed gate
uses null; a post-preprocessing unsupported result cannot erase the execution.
Whenever provenance is non-null, `detector` is also non-null,
`execution_provenance.backend_id`, `backend_version`, and `model_revision`
exactly match `detector.id`, `version`, and `model_revision`, and the artifact
digests refer to those exact pinned backend/model artifacts. This invariant
also applies to `unsupported`, `insufficient_evidence`, and `failed`, not only
to an available band.

### `not_run`

- `risk_band` is `null`.
- `evidence_quality` is `none`.
- `detector` and `calibration` are `null` unless a configured but intentionally disabled backend is being described elsewhere.
- `execution_provenance` is `null` because no backend executed.
- `error_category` is `null`.
- At least one reason code is present.

### `unsupported`

- `risk_band` is `null`.
- `evidence_quality` is `none`.
- `error_category` is `null`.
- At least one of language, domain, format, length bucket, or calibration is explicitly identified as unsupported.

### `insufficient_evidence`

- `risk_band` is `null`.
- `evidence_quality` is `insufficient`.
- `error_category` is `null`.
- Detector identity may be present.
- `execution_provenance` is non-null when the detector executed.
- At least one abstention reason is present.
- A raw score cannot be promoted to a public band.

### `available`

- `risk_band` is non-null.
- `evidence_quality` is `calibrated_in_domain`.
- `error_category` is `null`.
- `detector`, `calibration`, `execution_provenance`, `language`, `domain_id`,
  `tokens_evaluated`, `tokenizer_id`, and `min_tokens_required` are non-null;
  both execution artifact digests use `sha256:<64 lowercase hex>` and
  `artifact_verification` is `verified`. The model card, calibration artifact,
  and evaluation card digests use the same format and pin the exact documents
  and threshold package used for the band.
- Detector, model revision, language, domain, and length bucket match the calibration card exactly.
- `execution_provenance.backend_id`, `backend_version`, and `model_revision`
  exactly equal `detector.id`, `version`, and `model_revision`, respectively.
  The verified backend and model artifact digests identify the pinned artifacts
  for precisely those IDs and that revision; a digest for another executable or
  model cannot satisfy the invariant.
- The standard authorship, error, paraphrasing, domain, drift, and high-stakes limitations are present.

### `failed`

- `risk_band` is `null`.
- `evidence_quality` is `none`.
- `error_category` is non-null and uses the closed safe category enum.
- Public errors contain a safe category and reason code, not credentials, prompts, input text, or raw model output.
- `execution_provenance` is present if detector execution began and otherwise null.

## Abstention gates

The gates run before risk-band assignment. Failing any required gate returns `unsupported` or `insufficient_evidence`.

### Explicit opt-in

AI-origin analysis is not implied by `checks: ["quality", "slop", "voice"]`.
It requires `ai_origin` in the current request, at least one quality check in
that same request, and a trusted runtime configuration with a selected backend;
for example, `checks: ["quality", "ai_origin"]`. An AI-only request is invalid
input and returns exit code `2` before either analysis runs. This keeps the
surrounding `AnalysisResult`, policy status, and CLI exit semantics independent
of the experimental signal.

A committed voice profile cannot enable the module, choose a detector, configure a network endpoint, select credentials, or turn it into policy.

### Length

The proposed global 0.x floor is 80 detector tokens. A detector or calibration may require more, but never less. This is a conservative product policy, not a claim that 80 tokens make detection reliable.

The result reports the detector tokenizer, evaluated token count, and effective minimum. Empty regions, markup, code, quoted material, and excluded content do not count as evaluated text.

### Language

Language is detected or explicitly supplied and then validated against the calibration. German and English require separate calibration. A multilingual base model does not by itself establish calibrated German support.

Mixed-language input abstains unless a published calibration explicitly supports that mixture and reports its evaluation separately.

### Domain and distribution

The detector must identify a supported domain profile such as technical documentation, essay, marketing prose, or general editorial prose. Unknown or out-of-distribution input cannot inherit a general threshold silently.

When reliable domain selection is not possible, status is `unsupported` or `insufficient_evidence` rather than `available`.

### Editing, translation, and mixed authorship

Known metadata indicating translation, substantial editing, or mixed authorship triggers abstention unless the calibration explicitly covers that condition. Chunk disagreement may also trigger abstention, but agreement does not prove single authorship.

### Detector agreement

If a backend uses multiple detectors or chunks, its calibration card defines an agreement rule. Material disagreement returns `insufficient_evidence`; it is not averaged into a confident-looking band.

### Calibration

No calibration means no risk band. A calibration is invalid when any required compatibility key differs, including detector version, model revision, tokenizer, language, domain, length bucket, preprocessing, or threshold version.

## Proposed examples

These are design examples, not implemented responses.

### Disabled by default

```json
{
  "contract_version": "0.x",
  "experimental": true,
  "status": "not_run",
  "risk_band": null,
  "evidence_quality": "none",
  "error_category": null,
  "reason_codes": ["disabled_by_default"],
  "limitations": ["result_is_not_proof_of_authorship"],
  "language": null,
  "domain_id": null,
  "characters_evaluated": 0,
  "tokens_evaluated": null,
  "tokenizer_id": null,
  "min_tokens_required": null,
  "detector": null,
  "calibration": null,
  "execution_provenance": null
}
```

### Short text

```json
{
  "contract_version": "0.x",
  "experimental": true,
  "status": "insufficient_evidence",
  "risk_band": null,
  "evidence_quality": "insufficient",
  "error_category": null,
  "reason_codes": ["text_too_short"],
  "limitations": [
    "result_is_not_proof_of_authorship",
    "shorter_text_reduces_reliability",
    "false_positives_and_false_negatives_are_expected"
  ],
  "language": "de",
  "domain_id": "general_editorial",
  "characters_evaluated": 312,
  "tokens_evaluated": 63,
  "tokenizer_id": "detector-tokenizer@example-revision",
  "min_tokens_required": 80,
  "detector": {
    "id": "example-detector",
    "version": "0.1-design",
    "model_revision": "example-revision",
    "model_card_url": "https://example.invalid/model-card",
    "model_card_sha256": "sha256:3333333333333333333333333333333333333333333333333333333333333333"
  },
  "calibration": null,
  "execution_provenance": {
    "runtime_mode": "strict_offline",
    "deployment_scope": "local_process",
    "data_path": "on_device",
    "recipient_id": "local_device",
    "backend_id": "example-detector",
    "backend_version": "0.1-design",
    "backend_artifact_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    "model_revision": "example-revision",
    "model_artifact_digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    "artifact_verification": "verified",
    "network_used": false,
    "runtime_download_used": false
  }
}
```

### Calibrated in-domain result

```json
{
  "contract_version": "0.x",
  "experimental": true,
  "status": "available",
  "risk_band": "medium",
  "evidence_quality": "calibrated_in_domain",
  "error_category": null,
  "reason_codes": [],
  "limitations": [
    "result_is_not_proof_of_authorship",
    "false_positives_and_false_negatives_are_expected",
    "paraphrasing_can_change_the_result",
    "results_depend_on_language_and_domain",
    "results_depend_on_generator_and_decoding",
    "model_and_data_drift_can_invalidate_calibration",
    "not_for_high_stakes_decisions"
  ],
  "language": "de",
  "domain_id": "general_editorial",
  "characters_evaluated": 2380,
  "tokens_evaluated": 426,
  "tokenizer_id": "detector-tokenizer@example-revision",
  "min_tokens_required": 200,
  "detector": {
    "id": "example-detector",
    "version": "0.1-design",
    "model_revision": "example-revision",
    "model_card_url": "https://example.invalid/model-card",
    "model_card_sha256": "sha256:3333333333333333333333333333333333333333333333333333333333333333"
  },
  "calibration": {
    "id": "de-general-editorial-200plus",
    "version": "1-design",
    "language": "de",
    "domain_id": "general_editorial",
    "length_bucket": "200_plus",
    "target_false_positive_rate": 0.005,
    "calibration_artifact_digest": "sha256:4444444444444444444444444444444444444444444444444444444444444444",
    "evaluated_at": "2026-08-09",
    "evaluation_card_url": "https://example.invalid/evaluation-card",
    "evaluation_card_sha256": "sha256:5555555555555555555555555555555555555555555555555555555555555555"
  },
  "execution_provenance": {
    "runtime_mode": "strict_offline",
    "deployment_scope": "local_process",
    "data_path": "on_device",
    "recipient_id": "local_device",
    "backend_id": "example-detector",
    "backend_version": "0.1-design",
    "backend_artifact_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    "model_revision": "example-revision",
    "model_artifact_digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    "artifact_verification": "verified",
    "network_used": false,
    "runtime_download_used": false
  }
}
```

The `example.invalid` URLs and all detector identifiers above are placeholders. They must not ship in an implemented response.

## CI, policy, and reporting

In every Voice Lint 0.x release:

- `AIOriginSignal` is excluded from policy evaluation;
- detected CI execution returns `not_run` with reason `disabled_in_ci_0x` without invoking a backend;
- `--fail-on` ignores it;
- no `minimum_ai_score`, `fail_on_ai`, or equivalent option exists;
- it cannot produce CLI exit code `1` or `4` for an otherwise valid quality analysis;
- outside CI, detector failure degrades only the requested experimental section;
- SARIF output may include a non-actionable informational notification that analysis abstained, but cannot annotate authorship suspicion as a warning or error;
- MCP tools return the same limitations and cannot convert a band into a verdict.

Consumers can choose whether to display the optional section, but Voice Lint documentation and examples must not recommend automated adverse action from it.

## Raw scores and diagnostics

Detector logits, criterion values, probabilities, ensemble component scores,
and equivalent authorship-looking numbers are not exported anywhere in Voice
Lint 0.x. They are absent from the public object, CLI/JSON, HTTP, MCP, SARIF,
logs, caches, and diagnostic artifacts. Backend developers inspect such values
only inside backend-specific test harnesses outside the Voice Lint runtime and
public contract. A later diagnostic surface would require its own local-only
authorization, transport, retention, and misuse review; this document does not
authorize one.

## Model-card requirements

Every backend must publish a model and limitations card before it can be included in a release. The card includes:

1. detector ID, version, immutable model revision, hashes, runtime, and licenses;
2. base-model, code, weight, training-data, and evaluation-data licenses separately;
3. training languages, domains, length distribution, human sources, generator families, prompts, and decoding settings;
4. whether translated, paraphrased, human-edited, non-native, and mixed-authorship texts were included;
5. data provenance, consent or collection basis, exclusions, and known contamination risks;
6. preprocessing, tokenizer, truncation, chunking, and aggregation behavior;
7. known failure modes, unsupported uses, subgroup risks, and expected drift;
8. compute, memory, network, privacy, and content-retention behavior;
9. exact public risk-band mapping and compatible calibration cards;
10. a statement that the output is not proof and is not suitable as the sole basis for high-stakes action.

Source-visible code without compatible, redistributable weights and data is not sufficient for a default open-source backend.

## Evaluation- and calibration-card requirements

Each calibration card is detector-, language-, domain-, length-, and version-specific. It must publish:

- an untouched human calibration set and a separate final holdout;
- splits by author, time, prompt, domain, and generator family rather than only random row splits;
- separate German and English results;
- length-bucket results, including the abstention floor;
- false-positive rate and true-positive rate at target FPRs of `0.001`, `0.005`, and `0.01` where sample size permits;
- uncertainty intervals and human sample counts for every reported FPR;
- positive predictive value scenarios under stated realistic prevalence assumptions;
- coverage and abstention rates in addition to performance on classified samples;
- maximum and per-group false-positive rates for relevant writing populations;
- tests for non-native writing where the data supports responsible evaluation;
- unseen generators, later model generations, and held-out domains;
- greedy, sampled, and varied decoding settings;
- paraphrasing, humanization, translation, manual editing, typo, homoglyph, whitespace, and formatting attacks;
- mixed-document and chunk-level disagreement tests;
- calibration drift and retirement criteria;
- complete threshold derivation and immutable evaluation artifacts.

ROC-AUC or accuracy alone is insufficient. A calibration cannot be advertised for a language, domain, length bucket, or population that was not evaluated separately.

An `available` result is permitted only while monitoring shows that the matching calibration remains within its documented false-positive bounds. Otherwise the calibration is retired and the module returns `unsupported` or `insufficient_evidence`.

## Release gate

The experimental module remains absent from the default installation until:

1. the quality linter has its own useful DE/EN evaluation baseline;
2. exactly one backend passes license and supply-chain review;
3. its model and calibration cards satisfy this document;
4. JSON Schema validation enforces every field invariant;
5. short, unsupported, out-of-domain, mixed, and failed cases are tested to abstain;
6. tests prove that the signal cannot affect quality aggregation, policy, SARIF severity, or exit codes;
7. documentation and UI language pass a safety review for false certainty.

## Research basis

This contract is intentionally conservative because post-hoc detector performance has fundamental and empirical limits:

- Sadasivan et al., [Can AI-Generated Text be Reliably Detected?](https://arxiv.org/abs/2303.11156), analyzes limits as machine and human text distributions converge and documents evasion through paraphrasing.
- Dugan et al., [RAID: A Shared Benchmark for Robust Evaluation of Machine-Generated Text Detectors](https://aclanthology.org/2024.acl-long.674/), evaluates detectors across generators, domains, decoding settings, and adversarial transformations and shows that headline performance does not transfer reliably across conditions.

These sources support abstention, calibration-specific risk bands, low-FPR evaluation, and the prohibition on treating a detector result as proof. They do not establish that any future Voice Lint backend is reliable.

## Open design work

Before implementation:

1. define the canonical JSON Schema and structured error object;
2. choose a legally distributable candidate backend;
3. create independent German and English human corpora;
4. define a domain registry and out-of-distribution policy;
5. publish the tokenizer and chunking contract;
6. establish calibration retirement and drift-monitoring procedures;
7. decide whether the experimental module belongs in a separate package so the default quality installation has no detector dependencies.
