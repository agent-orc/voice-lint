# Scoring and policy contract

The proposed [review library and Voice Studio](on-page-review.md) keep these
analysis enums unchanged. Human judgments, annotation lifecycles and proposal
states belong to a separate review contract. A false-positive note does not
silently suppress CI; an explicit reviewed suppression is required. An
unmatched registry claim is advisory and unverified, not automatically false
or policy-eligible. Review output does not introduce a scalar publication gate.

Status: **proposed design contract, not implemented**

This document defines the intended scoring, coverage, status, and policy semantics for the Voice Lint 0.x design. It is not evidence that any score is calibrated or available in the current repository.

The conservative 0.x rule is:

> Findings and raw measurements may be useful before calibration. Numeric quality scores are not.

Until a dimension has a published calibration that meets the requirements below, its `score` is `null`. Until all contributing dimensions have compatible calibrations and sufficient coverage, `quality_score` and `slop_risk` are `null`.

## Scope and invariants

- Quality scores describe conformance to a versioned profile and rubric. They do not measure objective literary quality.
- SLOP risk describes evidence for named SLOP categories. It is not an AI-origin score.
- AI-origin signals are outside this contract and never contribute to findings, scores, policy, analysis status, or exit codes. See [AI-origin signal](ai-origin-signal.md).
- A numeric score alone never blocks a document in 0.x.
- A blocking policy decision requires at least one `active`, source-located, actionable finding from an eligible analyzer.
- Failed, disabled, or unsupported configured checks reduce coverage or make a result incomplete when they are applicable. An optional unselected check does neither, and no missing check produces a complete-looking score.
- Public results do not expose an uncalibrated `confidence` number.
- Comparisons are valid only when every compatibility key listed in this document matches.

## Canonical enums

The JSON values below are canonical. Human-readable reporters may translate their labels, but must preserve their meaning.

### Finding severity

```text
info | warning | error
```

| Value | Meaning |
|---|---|
| `info` | Reviewable observation that cannot fail policy. |
| `warning` | Actionable issue that may fail policy only when the profile explicitly sets `fail_on: warning`. |
| `error` | Actionable issue eligible to fail policy when `fail_on: error` or `fail_on: warning`. |

A finding is policy-eligible only when `policy_eligibility` is `eligible`, its
disposition is `active`, and it has a rule or trusted local rubric ID, category,
severity, engine and engine version, explanation, and original-source span.
Findings with `advisory` eligibility, `suppressed_source`, or
`baseline_existing` remain visible but are excluded. All M4 provider-derived
semantic findings are advisory; provider output cannot choose rule metadata or
blocking eligibility. Document-level measurements without an evidence span may
affect a dimension status, but cannot be the sole blocking evidence.

### Check execution state

```text
evaluated | not_applicable | not_run | unsupported | failed
```

| Value | Meaning |
|---|---|
| `evaluated` | The check ran successfully on its applicable input. |
| `not_applicable` | The check does not apply to this language, format, profile, or document region. |
| `not_run` | No engine execution began: the check was not selected, or a selected applicable check was disabled, dependency-unavailable, or rejected by a resource limit before execution. |
| `unsupported` | The selected engine cannot evaluate the applicable input. |
| `failed` | The check was selected and supported, but execution failed or timed out. |

The `EngineRunSummary` branch closes the denominator semantics. `not_selected`
uses `affects_coverage: false` and null coverage. A selected applicable
`not_run` check uses `affects_coverage: true` and zero coverage, as do
`unsupported` and `failed`. `not_applicable` is outside the denominator.
`evaluated` has positive coverage through 1 and no reason code. An optional
engine that was neither selected nor required is `not_selected`, even when the
runtime also has it disabled.

### Dimension status

```text
pass | warning | fail | insufficient_evidence | not_applicable | unavailable
```

| Value | Meaning |
|---|---|
| `pass` | Minimum coverage is met and no active warning or error finding belongs to the dimension. |
| `warning` | Minimum coverage is met and the highest eligible finding severity is `warning`. |
| `fail` | Minimum coverage is met and at least one eligible finding has severity `error`. |
| `insufficient_evidence` | Some applicable checks ran, but evaluated coverage is below the configured minimum. |
| `not_applicable` | No configured check in the dimension applies to this document. |
| `unavailable` | Checks apply, but none produced usable evidence because they were unsupported, failed, or required but not run. |

Dimension `fail` is an evidence summary. It does not itself fail policy; policy evaluates the underlying findings according to `fail_on`.

### Policy status

```text
pass | fail | not_evaluated
```

| Value | Meaning |
|---|---|
| `pass` | No active, policy-eligible finding meets the configured `fail_on` threshold. |
| `fail` | At least one active, policy-eligible finding meets the configured `fail_on` threshold. |
| `not_evaluated` | A required capability or dimension, or the overall minimum coverage, did not provide enough evidence to evaluate policy safely. |

`warn_below_quality_score` and per-dimension `warn_below` targets are advisory metadata in 0.x. They never change `policy_status` to `fail`. Before calibration, each configured target has state `unavailable` and a structured reason code.

### Analysis status

```text
pass | warning | fail | incomplete
```

The canonical precedence is:

1. `fail` when `policy_status` is `fail`;
2. `incomplete` when `policy_status` is `not_evaluated`;
3. `warning` when policy passed but there is an active warning finding, an available configured target is `below`, reduced optional coverage, fallback, or a degraded engine;
4. `pass` otherwise.

Transport, configuration, and internal failures are not additional analysis statuses. They use structured errors and CLI exit codes.

### Score status

```text
uncalibrated | available | insufficient_coverage | not_applicable | incompatible
```

| Value | Meaning |
|---|---|
| `uncalibrated` | No compatible published calibration exists; score is `null`. |
| `available` | A compatible calibration and sufficient coverage produced a score. |
| `insufficient_coverage` | Calibration exists, but evaluated coverage is below its threshold; score is `null`. |
| `not_applicable` | No calibrated scoring dimension applies; score is `null`. |
| `incompatible` | Inputs or contributing calibrations cannot be aggregated or compared; score is `null`. |

Each dimension has its own `score_status`. The summary uses independent
`quality_score_status` and `slop_risk_status` fields because quality and SLOP
may become calibrated, available, or coverage-limited at different times.

## Coverage

Coverage states how much of the configured, applicable analysis actually ran. It is not confidence and does not describe correctness.

Each check declares:

- its dimension;
- its configured weight;
- whether it is optional or required by policy;
- whether it applies to the document;
- its execution state.

For a dimension with at least one applicable check:

```text
dimension_coverage =
  sum(weight of successfully evaluated applicable checks)
  / sum(weight of all configured applicable checks)
```

Checks marked `not_applicable` are excluded from both sides. Applicable checks marked `not_run`, `unsupported`, or `failed` remain in the denominator. An optional check that was never selected is not part of the configured check set and therefore does not lower coverage.

When a dimension has no applicable checks, `coverage` is `null` and status is `not_applicable`.

Overall coverage is:

```text
summary.coverage =
  sum(dimension_weight * dimension_coverage)
  / sum(weight of applicable dimensions)
```

Dimensions with status `not_applicable` are excluded. An unavailable applicable dimension contributes zero coverage.

Coverage is serialized as a number from `0` through `1`, rounded to at most four decimal places. The proposed default minimum is `0.60`, but a calibrated profile may require a higher value. Meeting this threshold only permits a status decision; it does not imply that a numeric score is calibrated.

## Numeric scores

### Uncalibrated behavior

The design repository and initial deterministic implementation are uncalibrated. They must return:

```json
{
  "score": null,
  "score_status": "uncalibrated"
}
```

This rule applies even when an engine emits an internal heuristic, logit, similarity, readability value, or model probability. Raw measurements may be returned in a typed `measurements` object with units and engine versions; they must not be relabeled as a 0–100 quality score.

Before calibration:

- every dimension `score` is `null`;
- `quality_score` is `null`;
- `slop_risk` is `null`;
- status and policy derive from concrete findings and coverage only.

### Calibration requirements

A dimension may return a non-null score only when its calibration package publishes:

- calibration ID and immutable version;
- supported language, language variant, genre or domain, and length range;
- profile, ruleset, analyzer, rubric, parser, and model compatibility requirements;
- raw-measurement-to-score mapping;
- independently held-out human annotations and their license or provenance;
- sample counts and uncertainty by language and relevant subgroup;
- validation results, known failure modes, and release date;
- rules for out-of-domain detection and abstention;
- a regression test that reproduces the published mapping.

Changing a mapping, contributing analyzer, semantic rubric, or compatible model revision invalidates the previous calibration unless the calibration package explicitly covers that change.

### Score directions

After calibration:

- quality dimensions use integer scores from `0` through `100`, where higher means stronger conformance to that dimension's calibrated rubric;
- `slop_risk` uses an integer from `0` through `100`, where higher means more evidence for calibrated, named SLOP patterns;
- `slop_risk` is never calculated as `100 - quality_score`;
- neither value is a probability.

`quality_score` may be calculated only when every contributing non-null dimension uses a mutually compatible calibration and the configured minimum overall coverage is met:

```text
quality_score =
  sum(dimension_weight * dimension_score)
  / sum(weight of scored applicable dimensions)
```

The result is rounded to the nearest integer. The response must report which dimensions contributed and which were omitted. A profile must not compare or aggregate scores from incompatible calibrations.

### Numeric targets

After calibration, numeric targets may produce an advisory target state:

```text
met | below | unavailable
```

Unavailable reason codes are closed:

```text
score_uncalibrated | score_insufficient_coverage | score_not_applicable | score_incompatible
```

Every configured target is serialized separately from its score. It reports
the configured threshold, target status, and a stable reason code when
unavailable. Before calibration, the reason is `score_uncalibrated`; a target
must not be inferred from a null score. `met` and `below` require an available
score and therefore serialize `reason_code: null`.

In 0.x, `below` adds a non-blocking diagnostic and changes a passing
`analysis_status` to `warning`. It cannot create an error finding, set
`policy_status` to `fail`, or produce CLI exit code `1` by itself.

## Evidence instead of confidence

The 0.x public `Finding` contract omits `confidence`.

A deterministic or semantic finding may instead expose structured evidence such as:

```json
{
  "evidence": {
    "kind": "phrase_match",
    "matched_text": "in der heutigen schnelllebigen Welt",
    "measurement": null,
    "rationale": "The opening contributes no project-specific information."
  }
}
```

Evidence must be inspectable and tied to the reported source span. Provider logits, self-reported model confidence, and uncalibrated similarity values may appear only in opt-in diagnostic output and are not part of the stable public contract.
Text-bearing evidence is omitted from HTTP output unless
`include_evidence_text: true`; excerpts have the independent
`include_excerpts` projection flag.

## Status derivation

For each dimension:

1. determine applicable configured checks;
2. calculate coverage;
3. return `not_applicable` when none apply;
4. return `unavailable` when none completed;
5. return `insufficient_evidence` when coverage is below the minimum;
6. otherwise return `fail`, `warning`, or `pass` from the highest active eligible finding severity;
7. attach a numeric score only when a compatible calibration exists.

For policy and analysis:

1. require every profile/CLI `required_capability` to have an applicable successful engine run;
2. require each `required_dimension` and overall coverage to be non-null and at least `minimum_coverage`;
3. if either requirement fails, serialize it in `policy_evaluation.unmet_requirements` and set `policy_status: not_evaluated`;
4. otherwise evaluate active, policy-eligible findings against `fail_on`;
5. derive `analysis_status` using the precedence above, including an available `below` target as a warning;
6. add degradation and fallback information separately;
7. never consult an AI-origin signal.

## Proposed result fragment

This is a design example, not implemented output:

```json
{
  "summary": {
    "analysis_status": "warning",
    "policy_status": "pass",
    "coverage": 0.82,
    "quality_score": null,
    "quality_score_status": "uncalibrated",
    "slop_risk": null,
    "slop_risk_status": "uncalibrated"
  },
  "dimensions": {
    "clarity": {
      "status": "warning",
      "coverage": 1.0,
      "score": null,
      "score_status": "uncalibrated"
    },
    "voice_fit": {
      "status": "insufficient_evidence",
      "coverage": 0.55,
      "score": null,
      "score_status": "uncalibrated"
    }
  }
}
```

## CLI exit-code mapping

The proposed 0.x mapping is:

| Exit code | Condition |
|---:|---|
| `0` | Analysis completed and `policy_status` is `pass`, including a non-blocking `warning` analysis status. |
| `1` | Analysis completed and `policy_status` is `fail` because of concrete eligible findings. |
| `2` | Input, profile, schema, or configuration error. |
| `3` | Internal application error. |
| `4` | A required capability, dimension, or coverage threshold was unavailable; policy could not be evaluated. |

Neither a numeric score nor an AI-origin signal can produce exit code `1` in 0.x.

## Compatibility keys

Every result carries a closed comparison state:

```text
ready | not_available | incompatible
```

The initial reason-code set is
`score_uncalibrated | comparison_keys_incomplete | compatibility_key_mismatch | calibration_incompatible | coverage_incomparable`.
A normal single-document analysis is `ready` only when every relevant key is
non-null. `incompatible` is produced by an explicit comparison operation; it
names the mismatched keys and emits no regression delta.

The `comparison.keys` object records:

- profile hash and profile-schema version;
- ruleset ID and version;
- parser and source-mapping version;
- analyzer IDs and versions;
- semantic rubric digest, provider safety-configuration digest, exact route,
  model, client, and adapter versions when used;
- calibration IDs and versions when scores are non-null;
- language, language variant, domain, and length bucket;
- aggregation-contract version.

`analyzer_versions` is an engine-ID-to-version object for contributing
analyzers. When semantic analysis contributes, `semantic_contract` is an
object containing `rubric_id`, `rubric_version`, `rubric_digest`,
`provider_config_safety_digest`, `provider_id`, `route_id`, `model_id`,
`client_version`, and `adapter_version`; otherwise it is null. Calibration, language-variant, domain,
length-bucket, and aggregation keys remain explicit nullable fields rather than
being omitted.

A profile hash is lowercase `sha256:` plus exactly 64 hexadecimal digits over
the schema-defined canonical validated representation; the design fixture uses
`canonical-profile-json-1` (UTF-8 JSON, recursively sorted object keys,
preserved array order, no insignificant whitespace). Null required keys make the
state `not_available` with a reason; they are never treated as wildcards. If a
relevant key differs, Voice Lint describes the comparison as `incompatible`
instead of reporting a regression delta. Transport metadata such as
`analysis_id` and `batch_id` are outside the comparison envelope.

## Open design work

Before this contract can move from proposed to implemented:

1. publish canonical JSON Schemas for findings, dimensions, policy, and results;
2. accept the suppression grammar and contextual baseline-fingerprint ADR;
3. create the DE/EN annotation guide and holdouts;
4. decide which dimensions can be supported by deterministic evidence alone;
5. calibrate each score separately or keep it `null`;
6. keep all public numeric scores null until the corresponding calibration gate passes.
