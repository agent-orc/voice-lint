# Voice Lint architecture

Priority extension, 2026-09-06: [Voice Studio and the JS review
library](on-page-review.md) define a framework-independent embed, local Studio
host, website/Markdown source adapters, durable editorial metadata and a
guarded proposal service. Review routes are separate from the direct-text
analysis API. Browser DOM positions convert to the proposed canonical
code-point spans at the adapter boundary. Analysis dispositions and scores
keep their existing meaning. This is proposed `design-0` work, not implemented
behavior; the cited design controls the new review surface.

Status: **proposed**. This document defines target architecture and security
contracts. It does not claim that the described components are implemented.

## 1. Decision summary

Voice Lint is a local-first analysis engine with an optional loopback API. It
combines deterministic style checks, optional local language services, and
optional semantic providers. The architecture is built around these decisions:

1. A repository-controlled `VoiceProfile` describes editorial intent. It is
   data, not authority, and cannot enable network access, select a provider,
   name an endpoint, reference credentials, or approve billing.
2. A user-owned `RuntimeConfig` defines the maximum execution authority. A
   profile or request may narrow that authority but can never widen it.
3. The canonical external naming convention is `snake_case` for JSON, YAML,
   JSON Schema, CLI JSON, and HTTP payloads.
4. The four runtime modes are `strict_offline`, `local_connected`,
   `personal_cloud`, and `byok_cloud`. A future shared `service` deployment is
   a separate product boundary, not a fifth personal runtime mode.
5. Vale receives original markup, native metrics receive the parsed
   `DocumentModel`, and LanguageTool receives extracted prose segments whose
   offsets are mapped back to the original source.
6. Static provider capability declarations are separated from per-run
   `ExecutionProvenance`. Installed software or a configured credential is not
   proof of the account, billing source, tool isolation, or data path actually
   used.
7. Provider fallback and paid fallback are independent opt-ins and both default
   to `false`. Reduced coverage is the normal failure behavior.
8. Child tools run with an explicit argument vector, a fresh working directory,
   and a minimal environment allowlist. Process separation is useful isolation,
   but is neither a security sandbox nor automatic license compliance.
9. The HTTP server is loopback-only in the MVP, bearer-authenticated, protected
   against DNS rebinding and browser-origin abuse, and never accepts an
   arbitrary profile path.
10. Persistent caching is disabled by default. Raw text, prompts, model
    responses, evidence excerpts, and unsalted content hashes are not persisted
    by default.
11. Quality scoring, policy outcome, engine execution, availability, and
    AI-origin estimation use different status types. AI-origin estimation is
    never folded into the quality score.
12. A numeric score alone cannot block publication. A blocking decision must be
    backed by actionable findings and sufficient coverage.

## 2. Trust and configuration boundaries

The most important boundary is between editorial policy and execution
authority.

| Input | Typical owner | Trust | May contain | Must not grant |
|---|---|---:|---|---|
| `VoiceProfile` | repository or content team | untrusted declarative data | terms, examples, rule settings, weights, thresholds, allowed tone ranges | network access, provider or model selection, endpoints, commands, file roots, environment-variable references, credentials, billing approval, fallback approval |
| `RuntimeConfig` | local user or administrator | trusted local configuration | runtime mode, enabled adapters, provider allowlist, endpoint allowlist, credential references, approved file roots, limits, cache policy, profile registry | authority beyond compiled safety invariants |
| analysis request | caller | untrusted input | text, `document_format`, registered `profile_id`, requested output fields, stricter per-request limits | a new profile path, provider, endpoint, mode, credential, file root, billing permission, fallback permission |
| tool or model output | external component | untrusted result | schema-conforming findings and usage metadata | commands, configuration changes, follow-up tools, arbitrary files, trusted HTML/Markdown |

### 2.1 `VoiceProfile`

A profile is portable editorial data. It may express what should be measured,
not how the machine obtains the measurement. Security-sensitive keys are
forbidden rather than ignored so that a malicious profile fails visibly.
Environment interpolation and executable hooks are not supported in profiles.

Profiles may request a capability such as `semantic_tone_comparison`, but the
runtime decides whether an allowed engine can satisfy it. If not, the result
reports reduced coverage; the profile cannot activate a cloud provider.
A profile may mark a closed, non-authoritative capability or dimension as
required for policy evaluation. That declaration can make a result
`incomplete`; it still cannot enable an engine or widen runtime authority.

Example-corpus paths are relative to the profile directory. The loader rejects
absolute paths, parent traversal, symlinks or junctions that escape that
directory, unsupported file types, and configured size limits. A cloud adapter
may receive example text only when its transfer manifest and consent cover the
corpus as well as the analyzed document.

### 2.2 `RuntimeConfig`

The runtime configuration is stored outside repositories by default and is
owned by the user running Voice Lint. It defines a ceiling, not a suggestion.
Examples include:

```yaml
schema_version: 1
mode: strict_offline
engines:
  native_metrics:
    enabled: true
  vale:
    enabled: true
semantic:
  enabled: false
  provider: null
  provider_config_id: null
  provider_route: null
  fallback_targets: []
  allow_provider_fallback: false
  allow_paid_fallback: false
  max_parallel: 1
  max_documents_per_invocation: 0
  max_requests_per_invocation: 0
  max_requests_per_process_session: 0
  quota_limits: []
  quota_process_session_limits: []
  data_handling:
    allow_local_client_history: false
    allowed_provider_retention_modes: [no_provider_storage]
    max_provider_retention_days: 0
    allow_unknown_provider_retention: false
    allow_provider_training_use: false
    allow_provider_managed_telemetry: false
cost:
  allow_paid_primary: false
  max_paid_cost_per_analysis: { currency: USD, scale: 6, units: "0" }
  max_paid_cost_per_invocation: { currency: USD, scale: 6, units: "0" }
  max_paid_cost_per_process_session: { currency: USD, scale: 6, units: "0" }
  allow_paid_provider_verify: false
  max_paid_cost_per_provider_verify: { currency: USD, scale: 6, units: "0" }
cache:
  mode: "off"
profiles:
  product-copy:
    path: C:/Users/example/AppData/Local/voice-lint/profiles/product-copy.yml
mcp:
  transport: stdio
  roots: {}
```

The profile registry maps a stable `profile_id` to a locally approved file. The
HTTP API accepts only that ID. An interactive CLI may let a user explicitly
load another profile path, but the file is still parsed as an untrusted
`VoiceProfile` and cannot alter runtime authority.

`mcp.roots` is a Voice-Lint server registry, not authority delegated by an MCP
client or the protocol's roots capability. Each stable `root_id` binds one
canonical local directory, an `allowed_profile_ids` set, and exactly one
`default_profile_id` from that set. The initial stdio server accepts file
analysis only through these IDs. A request cannot submit or register a root,
and a root entry cannot point to a profile that is absent from `profiles`.
`voice-lint runtime mcp-root register` is the planned explicit, user-run writer
for this registry; it rejects symlinks, junctions, aliases, and remapping unless
the user supplies a separate replacement flag.

`semantic.fallback_targets` is a closed, ordered allowlist in this trusted
configuration. Every entry has a stable target ID, a user-owned provider
configuration ID, provider ID, exact provider route ID, exact model ID or
explicit `null`, recipient ID, data path, and allowed billing sources. The
provider configuration binds endpoint/auth references and cannot come from a
repository. An empty list means that no provider fallback can occur even if a
request is otherwise eligible. A repository profile or analysis request cannot
add or alter an entry.

Recipient and data-path knowledge before disclosure, the personal-adapter
tool-isolation floor, and positive local-single-user verification are compiled
safety invariants, not `require_*` toggles. Unknown billing is treated as
possibly paid. Runtime configuration may narrow execution further, but it
cannot switch these checks off.

The data-handling flags are explicit user consent, not verification claims.
The default denies vendor-client history, provider storage beyond an explicit
zero-day/no-storage mode, unknown provider retention, provider training use,
and provider-managed telemetry. Retention must match both the closed mode list
and the maximum day count. Before disclosure, the selected route must expose
version-matched evidence for local client persistence, provider retention and
training policy, and telemetry. A stricter administrator policy always wins;
when a required fact is unavailable the provider route is ineligible.

### 2.3 Effective configuration

The execution planner computes the effective authority before any user text is
sent to an analyzer:

```text
compiled safety invariants
        INTERSECT user-owned RuntimeConfig
        INTERSECT request restrictions
        THEN apply VoiceProfile editorial policy
```

A request can disable an analyzer or lower a limit. It cannot change
`strict_offline` to a connected mode, add a provider, change an endpoint, turn
on caching, or enable fallback. Unknown security-sensitive fields fail schema
validation. External schemas use `additionalProperties: false` where forward
compatibility does not require an extension namespace.

## 3. Runtime modes

The runtime mode is a maximum analysis-engine data-movement envelope. Selecting
a mode does not automatically select a provider or approve a cost. The HTTP
listener is a transport outside that engine envelope: the `strict_offline` CLI
process opens no sockets, while an API-hosted `strict_offline` analysis permits
only the API's already-open authenticated loopback listener.

| Mode | Permitted execution | Network contract | Intended use |
|---|---|---|---|
| `strict_offline` | in-process analyzers and local child processes using files or stdio | CLI process: zero socket/network I/O; API-hosted analysis: no analyzer/provider sockets beyond the API listener; LanguageTool, Ollama, and cloud adapters are ineligible | deterministic local checks and air-gapped CLI work |
| `local_connected` | `strict_offline` capabilities plus explicitly allowlisted loopback services such as a local LanguageTool or Ollama instance | Voice Lint connects only to loopback literals, local IPC, or named local sockets; no LAN, DNS-named, or Internet destination | richer local analysis through a user-trusted sidecar; loopback alone does not prove that the sidecar has no egress |
| `personal_cloud` | an explicitly selected official provider CLI or SDK using the current local user's session | selected minimum-necessary text leaves the host for provider inference | single-user local use of an existing personal subscription, where officially supported |
| `byok_cloud` | an explicitly selected provider API or official SDK using a configured user-owned credential | selected minimum-necessary text leaves the host; provider terms and account billing apply | explicit API-key or organization-account use |

Additional rules:

- Every mode still permits eligible deterministic local analyzers. Connected
  modes add authority to that baseline; they do not replace the local pipeline.
- `strict_offline` is a behavioral contract and is covered by tests that fail on
  attempted socket creation. It is not a claim that an untrusted local binary
  is contained like a hardened OS sandbox; only trusted, pinned local tools are
  eligible.
- The zero-network rule also covers capability probes, update checks, telemetry,
  DNS resolution, and license checks. Ineligible connected adapters are not
  started or probed in `strict_offline`.
- `local_connected` accepts `127.0.0.1`, `[::1]`, or an explicitly configured
  local IPC endpoint. A hostname that merely resolves to loopback is not enough.
- Loopback HTTP adapters disable proxy discovery and proxy environment
  variables, treat every redirect as an error, perform no DNS resolution,
  verify the connected peer address is loopback, and ignore response-supplied
  follow-up URLs. These checks prevent an allowlisted URL from becoming an SSRF
  or egress trampoline.
- `local_connected` constrains Voice Lint's transport, not an independently
  managed sidecar's internals. The user must trust and configure that sidecar;
  results report `loopback_local_service`, never infer `on_device`, and do not
  claim that the sidecar itself was egress-free. Hardening or attesting the
  sidecar is outside the 0.x Voice Lint transport contract.
- A personal CLI runs locally, but its model inference is usually remote. It is
  therefore `personal_cloud`, not offline or local inference.
- `personal_cloud` adapters are local, single-user features. They must not be
  exposed through a shared or hosted Voice Lint service.
- `byok_cloud` does not imply permission to spend. A primary metered call also
  requires `cost.allow_paid_primary: true`, an explicit currency, and a nonzero
  `max_paid_cost_per_analysis` ceiling.
  `allow_paid_fallback` applies only after a primary attempt and cannot grant
  primary-call authority.
- The MVP API never binds to a non-loopback interface, regardless of mode.

## 4. Proposed repository layout

```text
apps/
  cli/                       command-line entry point
  loopback-api/              authenticated local HTTP API
packages/
  contracts/                 JSON Schemas and generated public types
  core/                      planner, pipeline, normalization, policy, scoring
  document-model/            parsers, prose segments, source maps
  profile/                   untrusted VoiceProfile loading and validation
  runtime-config/            trusted local configuration and profile registry
  analyzer-native/           readability, repetition, structure, terminology
  analyzer-vale/             original-markup Vale adapter
  analyzer-languagetool/     prose-segment LanguageTool adapter
  provider-contract/         capabilities, invocation, provenance
  provider-local-model/      optional local model adapters
  provider-personal/         opt-in official personal CLI/SDK adapters
  provider-byok/             explicit API-account adapters
  policy/                    coverage-aware outcomes and CI exit mapping
  test-fixtures/             offset, privacy, isolation, and failure fixtures
docs/
  adr/                       architecture decision records
```

This layout is a target, not a statement about the current repository. Provider
packages depend on `provider-contract`; `core` must not import a vendor SDK
directly.

## 5. Runtime view

```text
                         trusted local boundary
 RuntimeConfig --------------------+
                                    v
 request --> validation --> execution planner --> bounded execution plan
    |              ^                    |
    |              |                    +--> deterministic analyzers
    |        VoiceProfile                +--> local service adapters
    |        (untrusted data)            +--> selected semantic provider
    v                                   |
 original source --> DocumentModel -----+
       |                  |
       |                  +--> prose segments + source maps
       +--> Vale

 analyzer results --> normalization --> coverage --> policy/scoring
                                    \--> separate AI-origin assessment
                                             |
                                             v
                           findings + outcomes + ExecutionProvenance
```

The execution plan records every engine that may run, its input disclosure
class, timeout, byte/token budget, and fallback eligibility. Planning and
capability probing happen without user content and without a model inference
request.

## 6. Analysis pipeline

### 6.1 Validate and plan

1. Validate request shape, content type, size, `profile_id`, and requested
   `document_format`.
2. Resolve `profile_id` through the trusted runtime registry and validate the
   profile as untrusted declarative data.
3. Compute the effective runtime mode and analyzer/provider allowlist.
4. Perform content-free capability checks where needed.
5. Produce a bounded execution plan. If the plan violates the mode or cost
   policy, reject it before parsing or disclosing text.

### 6.2 Parse once into a `DocumentModel`

The parser retains the original source and produces:

- document format and encoding metadata;
- structural nodes such as headings, paragraphs, lists, links, code, and
  frontmatter;
- prose segments with stable `segment_id` values;
- a bidirectional source map from every normalized prose segment to the
  original source;
- exclusion labels for code, generated sections, quoted material, or other
  profile-defined non-prose regions.

Normalization must not destroy the ability to point a finding at the original
text. A parser error is an execution problem, not a low-quality finding.

### 6.3 Deterministic analyzers

Each deterministic analyzer receives the representation suited to it:

**Vale**

- Vale receives the original markup file, not a prose-only reconstruction.
- The adapter supplies an explicit generated configuration and pinned style
  directory; it does not discover repository or user Vale configuration and
  never runs package sync or download during analysis.
- For API text, the runtime writes the exact submitted markup to an isolated
  temporary file with an approved format extension, invokes Vale, and removes
  the temporary workspace after the process exits.
- Vale's markup-aware exclusions remain authoritative for its rules.
- The adapter normalizes Vale locations to Voice Lint source ranges and emits
  the Vale version, rule identifier, and configuration digest.

**Native metrics**

- Readability, sentence length, repetition, lexical diversity, terminology,
  and document-structure checks consume the `DocumentModel`.
- Metrics operate only on eligible nodes or segments and retain source-map
  references for every actionable observation.
- Threshold crossings create findings; a bare metric or score is not enough to
  block publication.

**LanguageTool**

- LanguageTool receives extracted prose segments, never the entire markup
  document by accident.
- Every request is associated with a `segment_id` and the segment's source map.
  Results are translated from the LanguageTool-native offset convention back
  to original-source ranges.
- Segment boundaries are preserved. The adapter must not concatenate text with
  undocumented sentinel characters that make offsets ambiguous.
- An HTTP LanguageTool service is eligible only in `local_connected` and only
  at an allowlisted loopback endpoint. It is not eligible in `strict_offline`.
- A future stdio/in-process LanguageTool implementation could qualify for
  `strict_offline` only after the zero-network contract is tested.

### 6.4 Semantic analysis

Semantic analysis is optional and coverage-aware:

1. Deterministic results and profile policy identify candidate spans.
2. The disclosure planner selects the minimum span and bounded context needed
   for each semantic check.
3. The provider receives a structured request containing only those segments,
   stable opaque IDs, the necessary rubric, and no repository path or unrelated
   document metadata.
4. The adapter validates structured output, rejects tool events, and maps
   results back through the source map.
5. If a semantic provider is unavailable, the default result is `rules_only`
   with reduced coverage, not an automatic call to another provider.

Prompts treat document text as untrusted quoted data. Content cannot add tools,
change the output schema, request secrets, or alter runtime configuration.
Raw provider output is never inserted into a repair or fallback prompt. A
single same-route repair reconstructs the original bounded request and adds
only closed, non-text-bearing schema error codes. A fallback reconstructs the
original minimized request for the new recipient and receives no primary
response, rationale, validator excerpt, exception text, or provider metadata.
This prevents copied user text and prompt-injected output from crossing a second
provider boundary.

### 6.5 Normalize, score, and return

All analyzers produce the same finding schema. The aggregator deduplicates
overlapping findings, calculates dimension coverage, computes eligible quality
scores, evaluates policy, and appends execution provenance. AI-origin output is
returned in a separate object and never changes quality findings or score.

## 7. Canonical contracts and naming

JSON Schema is the source of truth for persisted and transported contracts.
Field names and enum values are `snake_case`. Generated public TypeScript types
preserve those names; an internal adapter may use idiomatic private names only
after crossing the schema boundary.

Every top-level payload includes `schema_version`. Schema changes follow normal
compatibility rules; undocumented fields are not silently trusted.

### 7.1 Single-document and batch envelopes

`AnalysisResult` always describes exactly one document. Its `document_id` is
opaque for direct text and a normalized workspace-relative path for local file
analysis; it is never an absolute path. The core HTTP endpoint accepts and
returns one `AnalysisResult` only.

The required top-level field inventory is explicit even while its JSON Schemas
remain an M0 deliverable:

```ts
interface AnalysisResult {
  schema_version: "design-0";
  contract_status: "proposed";
  analysis_id: string;
  response_projection: {
    include_suggestions: boolean;
    include_excerpts: boolean;
    include_evidence_text: boolean;
  };
  document: {
    document_id: string;
    profile_id: string;
    language: string;
    document_format: "text" | "markdown";
    characters: number;
  };
  summary: {
    analysis_status: AnalysisStatus;
    policy_status: PolicyStatus;
    quality_score_status: ScoreStatus;
    quality_score: number | null;
    slop_risk_status: ScoreStatus;
    slop_risk: number | null;
    coverage: number | null;
  };
  diagnostics: Diagnostic[];
  policy_evaluation: PolicyEvaluation;
  targets: {
    quality_score: NumericTargetState | null;
    dimensions: Record<string, NumericTargetState>;
  };
  dimensions: Record<string, {
    score: number | null;
    score_status: ScoreStatus;
    status: DimensionStatus;
    coverage: number | null;
  }>;
  measurements: Measurement[];
  findings: Finding[];
  engine_runs: EngineRunSummary[];
  ai_origin_signal: AIOriginSignal;
  judge: JudgeRunSummary;
  comparison: {
    status: "ready" | "not_available" | "incompatible";
    reason_codes: string[];
    keys: Record<string, JsonValue>;
    mismatched_keys?: string[];
  };
  versions: Record<string, string | null>;
}
```

The AI-origin type is defined in the dedicated 0.x contract. Comparison reason
codes and key invariants are closed in [Scoring and policy](scoring.md).
`judge` is always present: when semantic analysis did not run, it uses a
`not_run` state and a non-null reason rather than ambiguous null provider
fields alone.

A CLI or bounded MCP multi-file operation returns one `BatchAnalysisResult`:

```ts
interface BatchAnalysisResult {
  schema_version: "design-0";
  contract_status: "proposed";
  batch_id: string;
  summary: {
    document_count: number;
    pass_count: number;
    warning_count: number;
    fail_count: number;
    incomplete_count: number;
  };
  provider_budget: InvocationProviderBudget | null;
  documents: AnalysisResult[];
}
```

Files are de-duplicated by verified file identity and ordered by normalized
workspace-relative path using Unicode code-point order. A batch never flattens
findings from different documents into one unscoped array. For CLI exit
aggregation, invocation/configuration errors use `2`, an internal failure that
prevents a valid envelope uses `3`, any incomplete document uses `4`, otherwise
any failed document uses `1`, and all other batches use `0`.

For a semantic batch, `provider_budget` is the aggregate invocation budget
reserved before the first disclosure. Each document's judge budget is its
deterministic slice; the sums of document reservations and actual usage must
equal or stay below the batch fields. A non-semantic batch uses null.

### 7.2 Separate status types

The system does not overload a general `status` value. The canonical public
enums are defined in [Scoring and policy](scoring.md) and
[AI-origin signal](ai-origin-signal.md):

```ts
type FindingSeverity = "info" | "warning" | "error";

type CheckExecutionState =
  | "evaluated"
  | "not_applicable"
  | "not_run"
  | "unsupported"
  | "failed";

type DimensionStatus =
  | "pass"
  | "warning"
  | "fail"
  | "insufficient_evidence"
  | "not_applicable"
  | "unavailable";

type PolicyStatus = "pass" | "fail" | "not_evaluated";
type AnalysisStatus = "pass" | "warning" | "fail" | "incomplete";

type ScoreStatus =
  | "uncalibrated"
  | "available"
  | "insufficient_coverage"
  | "not_applicable"
  | "incompatible";

type TargetStatus = "met" | "below" | "unavailable";
type TargetUnavailableReason =
  | "score_uncalibrated"
  | "score_insufficient_coverage"
  | "score_not_applicable"
  | "score_incompatible";

type FindingDisposition =
  | "active"
  | "suppressed_source"
  | "baseline_existing";
```

Provider invocation details use a separate adapter-level run-state vocabulary
inside `execution_provenance`; they do not substitute for any of the public
quality statuses above. An `error` finding does not mean an engine crashed, and
a timed-out provider does not itself mean the editorial policy failed.

### 7.3 Finding

```ts
type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

interface Finding {
  schema_version: "design-0";
  finding_id: string;
  rule_id: string;
  category: string;
  dimension: string;
  severity: FindingSeverity;
  message: string;
  location: SourceRange;
  excerpt?: string;
  suggestion?: string;
  engine_id: string;
  engine_version: string;
  ruleset_version?: string;
  rule_origin: "profile" | "builtin" | "third_party";
  policy_eligibility: "eligible" | "advisory";
  disposition: FindingDisposition;
  disposition_detail: {
    reason: string;
    expires_at: string | null;
    baseline_id: string | null;
  } | null;
  semantic_provenance?: {
    invocation_id: string;
    candidate_id: string;
    rubric_id: string;
    rubric_version: string;
    rubric_digest: string;
  };
  segment_id?: string;
  evidence?: Record<string, JsonValue>;
}

interface SourceRange {
  position_encoding: "unicode_code_point";
  start_char: number;
  end_char: number;
  start_line: number;
  start_column: number;
  end_line: number;
  end_column: number;
}
```

`message` and `suggestion` are safe plain text at the contract boundary.
Renderers escape them for their target format. Evidence text is opt-in in API
responses through `include_excerpts` and `include_evidence_text`, both `false`
by default. The response echoes those choices in `response_projection`.
Evidence text is never needed as a persistent cache key. The stable public
finding has no generic numeric `confidence`; structured evidence is preferred
to an uncalibrated probability.
Only findings that are both `active` and `policy_eligibility: eligible`
participate in policy. Suppressed, baseline, and advisory findings remain
visible but cannot block; expired suppressions are active findings plus a safe
diagnostic.

The disposition fields obey these closed invariants: `active` requires a null
`disposition_detail`; `suppressed_source` requires a non-empty reason, permits
an optional expiry, and requires a null `baseline_id`; `baseline_existing`
requires both a non-empty reason and non-null `baseline_id` and requires a null
expiry. Invalid combinations fail result validation.

### 7.4 Source positions: proposed ADR

The exact position convention is deliberately marked **proposed** until an ADR
is accepted. Before the M0 schema freeze, `docs/adr/0001-source-positions.md`
should decide and test at least:

- half-open original-source ranges `[start_char, end_char)`;
- Unicode code-point offsets rather than JavaScript UTF-16 code units;
- 1-based line and code-point column values for human display;
- whether CRLF counts as two source code points while remaining one line break;
- invalid UTF-8 behavior and normalization policy;
- mappings for emoji, combining marks, tabs, CRLF, Markdown escapes, entities,
  frontmatter, code fences, and overlapping parser nodes;
- the native offset units of every supported Vale and LanguageTool version.

Until that ADR is accepted, `SourceRange` above is the candidate contract, not
a finalized compatibility promise. Golden fixtures must verify round trips from
each analyzer back to the exact original substring.

### 7.5 Measurements and analyzer result

Raw measurements are versioned observations, not quality scores:

```ts
type MeasurementUnit =
  | "count"
  | "ratio"
  | "unicode_code_points"
  | "words"
  | "sentences"
  | "characters_per_sentence"
  | "words_per_sentence"
  | "index";

interface Measurement {
  measurement_id: string;
  dimension: string | null;
  value: number | null;
  unit: MeasurementUnit;
  status: "evaluated" | "not_applicable" | "unavailable";
  reason_code: string | null;
  scope: "document" | "segment";
  segment_id: string | null;
  engine_id: string;
  engine_version: string;
  method_version: string;
}

interface Diagnostic {
  code: string;
  level: "info" | "warning" | "error";
  message: string;
  engine_id?: string;
  safe_details?: Record<string, string | number | boolean | null>;
}
```

A schema defines the allowed `safe_details` keys for each diagnostic code.
Diagnostics never contain source text, secrets, paths, prompts, or raw child
output. `AnalysisResult.diagnostics` contains result-level policy, projection,
suppression, target, and degradation diagnostics; engine and provider run
objects retain their own scoped diagnostic arrays.
A diagnostic level is operational/reporting metadata and never substitutes for
finding severity or directly changes content policy.

```ts
interface AnalyzerResult {
  engine_id: string;
  engine_version: string;
  capabilities: string[];
  execution_state: CheckExecutionState;
  findings: Finding[];
  coverage: CoverageContribution;
  diagnostics: Diagnostic[];
}

interface CoverageContribution {
  configured_weight: number;
  evaluated_weight: number;
  coverage: number | null;
}
```

An analyzer exception is converted to a bounded execution result. It is not
converted into an editorial finding about the user's text.

## 8. Provider contract

### 8.1 Static capability declaration

A provider adapter declares what it can support in principle. Set-valued
capabilities avoid incorrectly treating a provider as having one permanent
authentication, deployment, or billing identity.

```ts
type RuntimeMode =
  | "strict_offline"
  | "local_connected"
  | "personal_cloud"
  | "byok_cloud";
type AuthMode =
  | "none"
  | "official_cli_session"
  | "official_sdk_oauth"
  | "api_key"
  | "service_identity";
type DeploymentScope =
  | "in_process"
  | "local_process"
  | "loopback_service"
  | "provider_cloud";
type BillingSource =
  | "none"
  | "personal_subscription"
  | "api_account"
  | "organization_account";
type StructuredOutputMode =
  | "native_schema"
  | "json_mode"
  | "prompt_and_validate";
type ToolIsolationLevel =
  | "not_applicable"
  | "tools_disabled_by_documented_configuration"
  | "restricted_read_only_by_documented_configuration"
  | "unverified";
type DataPath =
  | "on_device"
  | "loopback_local_service"
  | "provider_cloud";
type LocalClientPersistence =
  | "ephemeral_no_history"
  | "local_history_possible"
  | "unknown";
type CapabilityMaturity = "experimental" | "preview" | "stable";

interface ProviderCapabilityDeclaration {
  capability_id: string;
  maturity: CapabilityMaturity;
}

interface ProviderRouteDeclaration {
  route_id: string;
  runtime_mode: RuntimeMode;
  auth_mode: AuthMode;
  deployment_scope: DeploymentScope;
  data_path: DataPath;
  billing_source: BillingSource;
  structured_output_mode: StructuredOutputMode;
  tool_isolation_level: ToolIsolationLevel;
  local_client_persistence: LocalClientPersistence;
  capability_ids: readonly string[];
  maturity: CapabilityMaturity;
}

interface ProviderDescriptor {
  provider_id: string;
  adapter_version: string;
  adapter_maturity: CapabilityMaturity;
  capabilities: readonly ProviderCapabilityDeclaration[];
  routes: readonly ProviderRouteDeclaration[];
}
```

Examples of capability values include:

- `auth_mode`: `none`, `official_cli_session`, `official_sdk_oauth`, `api_key`,
  or `service_identity`;
- `deployment_scope`: `in_process`, `local_process`, `loopback_service`, or
  `provider_cloud`;
- `data_path`: `on_device`, `loopback_local_service`, or `provider_cloud`;
- `billing_source`: `none`, `personal_subscription`, `api_account`, or
  `organization_account`;
- `structured_output_mode`: `native_schema`, `json_mode`, or
  `prompt_and_validate`;
- `tool_isolation_level`: `not_applicable`,
  `tools_disabled_by_documented_configuration`,
  `restricted_read_only_by_documented_configuration`, or `unverified`.

Capabilities and routes are declarations, not proof of the current execution.
Each route is an explicit compatible tuple; independent support arrays are
deliberately forbidden because their Cartesian product could invent an unsafe
auth/billing/deployment combination. The execution planner selects one exact
`route_id` before disclosure and later records whether that route was actually
used. There is no single static `auth_owner`, `billing_mode`, or
`deployment_scope`, and no boolean such as `tools_can_be_disabled`. Adapter
maturity never upgrades a preview route or feature: each selectable capability
and route carries its own maturity, and the per-run result records the maturity
of every capability actually used.

### 8.2 Static probes and behavioral self-tests

A static capability probe may check executable presence, version output,
supported flags, endpoint shape, or official non-inference account metadata.
It runs automatically only when the mode permits it and must:

- send no user content or profile examples;
- make no model inference request and consume no model credit;
- avoid reading or copying private credential stores, browser sessions, token
  caches, or unrelated project configuration;
- avoid claiming that authentication or billing is verified if the official
  client does not expose trustworthy evidence without an inference call.

A behavioral isolation self-test is a different, explicitly authorized,
defense-in-depth diagnostic. It may send a fixed public synthetic string
through the selected provider to detect observable tools, hooks, MCP,
extensions, project instructions, or filesystem/network side effects. A
passing synthetic prompt cannot prove that no tool or hidden instruction is
available and therefore never upgrades the isolation level. Eligibility for
the 0.x semantic judge requires either a verified tool-less route declared
`not_applicable` or tool denial established from official, version-matched
non-inference documentation or metadata as
`tools_disabled_by_documented_configuration`; `restricted_read_only...` and
`unverified` are ineligible. The self-test never uses user text or profile
examples, is bound to an exact client version and configuration digest, has an
observation and expiry time, and may consume quota or money. Cloud self-tests
require a disclosure entry, separate paid-probe authorization, a positive
preflight bound when possibly paid, and the same provenance rules as semantic
analysis. They never run in `strict_offline`; a local-model self-test may run
only within its permitted local mode. A configured required but absent, stale,
or failed behavioral result makes the adapter unavailable without changing its
isolation claim.

Every observed fact carries `verification: verified | configured | inferred |
unavailable`. `configured` means Voice Lint knows only what the trusted runtime
requested; it is not proof of effective behavior. Credential material remains
inside the selected official client or SDK whenever possible.

### 8.3 Per-invocation `ExecutionProvenance`

Every semantic invocation produces provenance based on what actually happened.
The `ObservedValue` union makes evidence state structural: `verified` and
`inferred` require a non-null effective value; `configured` requires a non-null
requested value and has no effective value; `unavailable` has no effective
value but may preserve the requested value. A `verified` data-handling or
provider claim additionally requires its matching immutable evidence reference;
the union alone is not that evidence.

```ts
type VerificationStatus =
  | "verified"
  | "configured"
  | "inferred"
  | "unavailable";

type ObservedValue<T> =
  | {
      configured: T | null;
      effective: T;
      verification: "verified" | "inferred";
    }
  | {
      configured: T;
      effective: null;
      verification: "configured";
    }
  | {
      configured: T | null;
      effective: null;
      verification: "unavailable";
    };

type ProviderVerifiedClaim =
  | "route_tuple"
  | "auth_mode"
  | "billing_source"
  | "tool_isolation"
  | "local_client_persistence"
  | "provider_retention"
  | "provider_training_use"
  | "telemetry";

interface ImmutableEvidenceReference {
  evidence_ref_id: string;
  source_kind: "official_documentation_snapshot" | "official_metadata_snapshot";
  source_url: string | null;
  source_version: string;
  source_sha256: string;
  applicable_client_version: string;
  applicable_configuration_digest: string;
  observed_field: string | null;
  observed_value: JsonValue;
  verification: "verified";
}

interface VerifiedProviderClaim {
  claim: ProviderVerifiedClaim;
  value: JsonValue;
  evidence_ref_ids: string[];
}

interface ExactQuantity {
  units: string;
  scale: number;
}

interface ExactMoneyAmount extends ExactQuantity {
  currency: string;
}
```

`ExactQuantity.units` is a canonical non-negative base-10 integer string and
`scale` is an integer from 0 through 12; the represented value is
`units × 10^-scale`. Money additionally uses an uppercase ISO 4217 currency.
Schemas reject signs, exponents, decimal points in `units`, leading zeroes
other than `"0"`, non-finite values, and floating-point amount fields.
Comparisons rescale with integer arithmetic, reject currency mismatches, and
round every derived reservation upward to the configured scale. Provider-
reported amounts remain post-execution evidence and never reduce a previously
reserved upper bound.
Request counts use only the scalar `max_provider_requests`/`request_count`
fields. Quota lines never repeat requests. In `design-0`, provider credit,
premium-request, and provider-defined units always use
`scope: provider_config` with non-null provider configuration and provider IDs,
so aggregate budgets never combine unrelated vendor units. Standard
`ai_credit` and `premium_request` lines use `provider_unit_id: null` because the
closed unit enum is their identity. A `provider_defined` line requires a
non-empty, stable provider-authoritative `provider_unit_id`, unique within the
provider configuration safety digest. A future genuinely global quota needs a
new schema version; the previously reserved `invocation` scope is not accepted
by `design-0`.
Every `QuotaBudgetLine.evidence.evidence_ref_id` resolves to an immutable, owner-protected
snapshot from official provider documentation or metadata. The referenced
limit/rule ID, version, and lowercase `sha256:` source digest must match that
snapshot and the active provider configuration safety digest before
reservation. A provider-reported post-run quantity is usage evidence only and
cannot replace this preflight evidence or lower the reservation. Process-
session lines are aggregate counters; their originating document, invocation,
or verification budget retains the complete evidence union.
Empty invocation and process-session quota lists are valid only when
version-matched, verified route evidence says the route consumes no quota unit
beyond the separately counted provider requests. If any credit, premium, or
provider-defined unit is consumed or possibly consumed, that exact identity
requires both an invocation limit and a process-session limit; an unknown unit
or conversion makes provider execution ineligible. When actual quota usage is
unavailable, the usage line carries `quantity: null` and `verification:
"unavailable"`, and the ledger retains the complete conservative reservation
instead of refunding an unobserved amount. `configured` is not a valid
verification state for actual usage.

```ts
type QuotaIdentity =
  | {
      scope: "provider_config";
      provider_config_id: string;
      provider_id: string;
      unit: "ai_credit" | "premium_request";
      provider_unit_id: null;
    }
  | {
      scope: "provider_config";
      provider_config_id: string;
      provider_id: string;
      unit: "provider_defined";
      provider_unit_id: string;
    };

type QuotaBoundEvidence =
  | {
      kind: "provider_enforced_limit";
      provider_limit_id: string;
      provider_limit_version: string;
      evidence_ref_id: string;
      source_sha256: string;
    }
  | {
      kind: "version_pinned_usage_rule";
      usage_rule_id: string;
      usage_rule_version: string;
      evidence_ref_id: string;
      source_sha256: string;
    };

type ProviderQuotaUsageLine = QuotaIdentity & (
  | {
      quantity: ExactQuantity;
      verification: "verified" | "inferred";
    }
  | {
      quantity: null;
      verification: "unavailable";
    }
);

interface ProviderUsage {
  request_count: number;
  repair_attempt_count: number;
  input_tokens?: number;
  output_tokens?: number;
  quota_usage: ProviderQuotaUsageLine[];
  provider_reported_cost?: ExactMoneyAmount;
}

type QuotaBudgetLine = QuotaIdentity & {
  max_quantity: ExactQuantity;
  reserved_upper_bound: ExactQuantity;
  evidence: QuotaBoundEvidence;
  verification: "verified";
};

interface DocumentProviderBudget {
  document_id: string;
  max_provider_requests: number;
  quota_limits: QuotaBudgetLine[];
  max_paid_cost_per_analysis: ExactMoneyAmount;
  reserved_paid_cost_upper_bound: ExactMoneyAmount;
  actual_usage: ProviderUsage;
}

interface InvocationProviderBudget {
  max_semantic_documents: number;
  max_provider_requests: number;
  quota_limits: QuotaBudgetLine[];
  max_paid_cost_per_invocation: ExactMoneyAmount;
  reserved_paid_cost_upper_bound: ExactMoneyAmount;
  document_budgets: DocumentProviderBudget[];
  actual_usage: ProviderUsage;
}

interface ProviderVerificationBudget {
  max_provider_requests: number;
  quota_limits: QuotaBudgetLine[];
  max_paid_cost_per_provider_verify: ExactMoneyAmount;
  reserved_paid_cost_upper_bound: ExactMoneyAmount;
  actual_usage: ProviderUsage;
}

type ProcessSessionQuotaBudgetLine = QuotaIdentity & {
  max_quantity: ExactQuantity;
  reserved_before: ExactQuantity;
  reserved_after: ExactQuantity;
};

interface ProcessSessionBudgetSnapshot {
  session_id: string;
  max_provider_requests: number;
  reserved_provider_requests_before: number;
  reserved_provider_requests_after: number;
  quota_limits: ProcessSessionQuotaBudgetLine[];
  max_paid_cost_per_process_session: ExactMoneyAmount;
  reserved_paid_cost_before: ExactMoneyAmount;
  reserved_paid_cost_after: ExactMoneyAmount;
}

interface InputDisclosureBase {
  disclosure_id: string;
  provider_config_id: string;
  provider_config_safety_digest: string;
  provider_id: string;
  route_id: string;
  model_id: string | null;
  characters_disclosed: number;
  recipient_id: string;
  data_path: DataPath;
  consent_basis: "not_required_on_device" | "current_run" | "trusted_runtime";
  data_handling: DataHandlingEvidence;
}

type InputDisclosure = InputDisclosureBase & (
  | {
      attempt_kind: "primary" | "repair" | "fallback";
      content_scope: "selected_spans" | "bounded_context" | "whole_document";
      content_classes: Array<"document_text" | "voice_examples" | "rubric">;
    }
  | {
      attempt_kind: "behavioral_probe";
      content_scope: "public_synthetic_probe";
      content_classes: ["public_synthetic_probe"];
    }
);

interface PreflightCostBound {
  authorization_scope:
    | "primary_analysis"
    | "fallback_analysis"
    | "behavioral_probe";
  authorized: boolean;
  configured_ceiling: ExactMoneyAmount;
  computed_upper_bound: ExactMoneyAmount;
  evidence:
    | {
        kind: "provider_enforced_limit";
        provider_limit_id: string;
        limit_scope: "per_request";
        observed_limit: ExactMoneyAmount;
        observed_at: string;
        valid_until: string;
        evidence_ref_id: string;
        verification: "verified";
      }
    | {
        kind: "pinned_pricing_and_token_caps";
        source_url: string;
        price_version: string;
        effective_at: string;
        source_sha256: string;
        input_price_per_million_tokens: ExactMoneyAmount;
        output_price_per_million_tokens: ExactMoneyAmount;
        verification: "verified";
      };
  input_token_cap: number | null;
  output_token_cap: number | null;
  verified_before_content_disclosure: boolean;
}

type ProviderProbeReasonCode =
  | "requirements_met"
  | "client_version_mismatch"
  | "configuration_digest_mismatch"
  | "result_expired"
  | "official_metadata_unavailable"
  | "tool_event_observed"
  | "side_effect_observed"
  | "invalid_probe_output"
  | "probe_execution_failed";

interface ProviderProbeReference {
  probe_run_id: string;
  probe_version: string;
  kind: "static_capability" | "behavioral_isolation";
  status: "passed" | "failed" | "unavailable" | "stale";
  reason_codes: ProviderProbeReasonCode[];
  client_version: string | null;
  configuration_digest: string;
  observed_at: string;
  authorization_valid_until: string;
  result_digest: string;
}

interface ProviderVerificationResult {
  schema_version: "design-0";
  probe_run_id: string;
  result_digest: string;
  probe_version: string;
  kind: "static_capability" | "behavioral_isolation";
  status: "passed" | "failed" | "unavailable";
  reason_codes: ProviderProbeReasonCode[];
  verified_claims: VerifiedProviderClaim[];
  evidence_references: ImmutableEvidenceReference[];
  provider_config_id: string;
  provider_id: string;
  route_id: string;
  client_version: string | null;
  configuration_digest: string;
  observed_at: string;
  authorization_valid_until: string;
  retention_until: string;
  synthetic_input_used: boolean;
  input_disclosures: InputDisclosure[];
  preflight_cost_bound: PreflightCostBound | null;
  verification_budget: ProviderVerificationBudget | null;
  process_session_budget: ProcessSessionBudgetSnapshot | null;
  usage: ProviderUsage;
  diagnostics: Diagnostic[];
}

type FallbackTriggerReasonCode =
  | "primary_timeout"
  | "primary_quota_exhausted"
  | "primary_authentication_unavailable"
  | "primary_malformed_output"
  | "primary_provider_unavailable";

type FallbackOutcomeReasonCode =
  | "not_attempted_by_policy"
  | "target_not_allowlisted"
  | "target_route_mismatch"
  | "recipient_consent_missing"
  | "paid_fallback_not_authorized"
  | "preflight_cost_rejected"
  | "runtime_context_ineligible"
  | "data_handling_ineligible"
  | "target_timeout"
  | "target_quota_exhausted"
  | "target_authentication_failed"
  | "target_malformed_output"
  | "target_provider_failed";

interface FallbackTransition {
  attempted: boolean;
  outcome: "not_attempted" | "succeeded" | "failed" | "rejected";
  trigger_reason_code: FallbackTriggerReasonCode;
  outcome_reason_code: FallbackOutcomeReasonCode | null;
  from_provider_config_id: string;
  from_provider_config_safety_digest: string;
  from_provider_id: string;
  from_route_id: string;
  from_model_id: string | null;
  to_provider_config_id: string;
  to_provider_config_safety_digest: string;
  to_provider_id: string;
  to_route_id: string;
  to_model_id: string | null;
  changes_data_recipient: boolean;
  from_recipient_id: string | null;
  to_recipient_id: string | null;
  from_data_path: DataPath | null;
  to_data_path: DataPath | null;
  from_auth_mode: AuthMode | null;
  to_auth_mode: AuthMode | null;
  from_billing_source: BillingSource | null;
  to_billing_source: BillingSource | null;
  paid_path_authorized: boolean;
  matched_fallback_target_id: string | null;
  disclosure_ids: string[];
  preflight_cost_bound: PreflightCostBound | null;
  usage: ProviderUsage;
}

type RuntimeContextClass =
  | "local_single_user"
  | "ci"
  | "container"
  | "shared_service"
  | "proxied"
  | "unknown";

type RuntimeContextReasonCode =
  | "local_user_boundary_verified"
  | "ci_detected"
  | "container_detected"
  | "shared_service_detected"
  | "proxy_detected"
  | "local_single_user_unverified";

interface RuntimeContextEvidence {
  required: "local_single_user" | "not_applicable";
  effective: RuntimeContextClass;
  verification: "verified" | "unavailable";
  reason_codes: RuntimeContextReasonCode[];
  assessed_at: string;
}

interface ExecutedProviderCapability {
  capability_id: string;
  maturity: CapabilityMaturity;
  execution_state: "used" | "not_used";
}

interface ProviderRetentionPolicy {
  mode: "no_provider_storage" | "time_bounded" | "provider_default" | "unknown";
  max_days: number | null;
  policy_id: string | null;
}

interface DataHandlingEvidence {
  local_client_persistence: ObservedValue<LocalClientPersistence>;
  local_client_persistence_evidence_ref_ids: string[];
  provider_retention: ObservedValue<ProviderRetentionPolicy>;
  provider_retention_evidence_ref_ids: string[];
  provider_training_use: ObservedValue<"disabled" | "possible" | "unknown">;
  provider_training_use_evidence_ref_ids: string[];
  telemetry: ObservedValue<"disabled" | "provider_managed" | "unknown">;
  telemetry_evidence_ref_ids: string[];
}

interface ExecutionProvenance {
  invocation_id: string;
  adapter_version: string;
  client_name: string;
  client_version: string | null;
  runtime_mode: RuntimeMode;
  run_status:
    | "succeeded"
    | "failed"
    | "timed_out"
    | "quota_exhausted"
    | "rejected_before_disclosure";
  requested: {
    provider_config_id: string;
    provider_config_safety_digest: string;
    provider_id: string;
    route_id: string;
    model_id: string | null;
  };
  effective: {
    provider_config_id: string | null;
    provider_config_safety_digest: string | null;
    provider_id: string | null;
    provider_verification: VerificationStatus;
    route_id: string | null;
    route_maturity: CapabilityMaturity | null;
    route_verification: VerificationStatus;
    model_id: string | null;
    model_verification: VerificationStatus;
  };
  auth: ObservedValue<AuthMode>;
  deployment_scope: ObservedValue<DeploymentScope>;
  data_path: ObservedValue<DataPath>;
  recipient_id: ObservedValue<string>;
  billing: {
    source: ObservedValue<BillingSource>;
    metering: ObservedValue<"none" | "subscription_limit" | "token_metered">;
    overage_possible: boolean | null;
    overage_verification: VerificationStatus;
    paid_execution_authorized: boolean;
    preflight_cost_bound: PreflightCostBound | null;
  };
  structured_output_mode: ObservedValue<StructuredOutputMode>;
  capabilities: ExecutedProviderCapability[];
  tool_isolation: {
    requested: ToolIsolationLevel;
    achieved: ToolIsolationLevel | null;
    verification: VerificationStatus;
  };
  runtime_context: RuntimeContextEvidence;
  provider_verification_refs: ProviderProbeReference[];
  input_disclosures: InputDisclosure[];
  usage: ProviderUsage;
  diagnostics: Diagnostic[];
}
```

The `ExecutionProvenance` schema encodes the remaining observed-value pairs as
closed `oneOf` branches. `effective.provider_verification` is `verified` or
`inferred` only when provider configuration ID, safety digest, and provider ID
are all non-null; `configured` or `unavailable` requires all three to be null.
The route branch applies the same rule jointly to route ID and maturity. Model
verification requires a non-null model ID except when the verified exact route
declaration explicitly has no model; configured or unavailable model state is
null. `billing.overage_possible` and `tool_isolation.achieved` are non-null
exactly for `verified` or `inferred`, and null for `configured` or
`unavailable`. These states cannot be mixed into a free Cartesian product.

`input_disclosures` has one manifest entry for every transfer in that provider
attempt, including a repair or fallback attempt. This permits
multiple recipients to be represented honestly. Each entry records the content
scope and classes, actual recipient and data path, consent basis, and character
count, but never echoes the text. A rejected attempt that sends no content has
no disclosure entry. `disclosure_ids` on fallback transitions link them to the
relevant manifests. Provenance is returned to the caller and may be
retained only under the configured privacy policy. A semantic finding resolves
its `semantic_provenance.invocation_id` to this object; that indirection carries
provider, model, client, recipient, data path, probe, billing, maturity, usage,
and runtime-context evidence while the finding carries the rubric reference.
`InputDisclosure.consent_basis` is the single per-transfer authorization source.
`DataHandlingEvidence` records verified route facts and deliberately does not
duplicate or override run consent.
`characters_disclosed` is positive and semantic attempts have a non-empty class
set. The discriminated disclosure union makes a behavioral probe exactly one
`public_synthetic_probe` scope/class tuple and forbids document text, examples,
or rubric classes; semantic attempts cannot claim the synthetic tuple.

A behavioral probe is a separate run, not usage inside a later document
analysis. `ProviderVerificationResult` owns its synthetic disclosure, cost
bound, budget, and usage. An analysis includes only immutable
`ProviderProbeReference` snapshots with a digest and lifecycle dates; it never
copies historical probe usage into the current invocation budget. The
reference is valid only when its provider route, client version, configuration
digest, and result digest match the stored owner-protected verification result.
`result_digest` is lowercase `sha256:` over canonical UTF-8 JSON with that field
omitted; the eventual schema names this digest contract explicitly.
A passed result uses `requirements_met`; a failed or unavailable result carries
at least one non-success reason. A stale analysis reference uses
`result_expired`, `client_version_mismatch`, or
`configuration_digest_mismatch`. Static results have no synthetic input,
disclosure, paid bound, or budget and report zero usage. A behavioral result is
identified by `kind: behavioral_isolation`, and a cloud run owns exactly one
`public_synthetic_probe` disclosure plus any applicable positive cost bound.
Verification artifacts are owner-only local state and contain no user document
text. `authorization_valid_until` stops all new use and makes an analysis
reference `stale`; it does not erase historical evidence. The artifact remains
resolvable until the separately configured `retention_until` (30 days after
authorization expiry by default, and lowerable), then is automatically removed.
`voice-lint provider verification status` and `purge` can remove it earlier.
Expiry or purge never re-authorizes a route; an old digest alone is insufficient.
Only official version-matched documentation or metadata may support a
`verified_claim`. Every claim links to at least one immutable evidence snapshot
with the exact client version, safety-configuration digest, observed value, and
`sha256:<64 lowercase hex>` source digest. A URL without the snapshot digest is
not evidence. Behavioral results have an empty verified-claims list: their
observations may fail a route but cannot prove a safety claim.

For every paid or possibly paid execution, the matching preflight object is
non-null and records the authorization, currency, user-configured ceiling,
conservative computed upper bound, derivation basis, and whether it was
verified before any content was disclosed. The bound is valid only when both
amounts use positive exact integer units at a common scale, currencies match,
the computed bound does not exceed the configured ceiling, and
`verified_before_content_disclosure` and `authorized` are true. Every paid or
possibly paid disclosure also requires
`ExecutionProvenance.billing.paid_execution_authorized: true`; a fallback
additionally requires its linked `FallbackTransition.paid_path_authorized` to
be true. Whenever these authorization fields coexist for one attempt they must
be identical. `authorized: false` is valid only for a rejected preflight plan
with no disclosure and zero request, token, quota, or cost usage. Otherwise the
invocation is rejected without sending text. Actual usage
and provider-reported cost remain separate post-execution accounting fields.
For pinned pricing, the immutable source digest, version/effective time, exact
unit prices, currency, and hard token caps reproduce the calculation; a mutable
URL or free-form label alone is not evidence. Provider-enforced limits must be
read back through an official verified control, be scoped to one request, name
a stable limit ID, include the exact observed amount and lifecycle, and link to
an immutable official metadata evidence snapshot. Account/monthly/session
limits alone do not bound one request and are ineligible as this evidence kind.

The runtime does not infer subscription billing from an installed CLI, infer
tool isolation from a requested flag, or infer a model ID from a default alias.
Requested, effective, and verification fields remain distinct. Every attempted
provider/model transition is recorded, including rejected attempts, reason,
data-recipient and data-path change, auth/billing change, per-attempt usage, and
whether a paid path was authorized.

`ExecutionProvenance` exists only once adapter execution has begun; the
top-level judge envelope represents `not_run`. `rejected_before_disclosure`
requires empty `input_disclosures` and zero request/token/quota/cost usage.
Every other transfer is represented by a disclosure manifest. For personal
subscription execution, `runtime_context` must be positively `verified` as
`local_single_user`; detection of CI, a container, a proxy/shared service, or
inability to verify the boundary makes the adapter unavailable. A caller's
assertion alone is never treated as verification.
The requested and effective provider-configuration digests cover only a
schema-defined canonical safety projection: route/config IDs, safety flags,
limits, data-policy choices, and adapter versions. Secrets, credential/account
identifiers, endpoints, local paths, and their raw hashes are excluded. Instead,
the projection contains locally keyed HMAC bindings over the canonical endpoint
and effective auth/account context plus an owner-managed binding generation;
only the outer public digest is serialized. Those bindings rotate whenever an
endpoint, credential context, or authenticated account changes, preventing an
old probe from surviving an ID-preserving configuration edit without exposing
the underlying value. If the effective account context needed for an
account-bound billing/data-policy claim cannot be obtained through an official
safe interface, that claim is unavailable. The projection digest is public
lowercase SHA-256 and must match every verification reference used by the
attempt. A changed safety projection invalidates the reference.

Every data-handling field marked `verified` has at least one corresponding
evidence-reference ID in the matched verification result. `configured`,
`inferred`, or `unavailable` values cannot cite verified evidence. Consent and
verification remain separate: evidence describes the route, while trusted
runtime/current-run consent decides whether that known policy is acceptable.
For retention, `no_provider_storage` requires `max_days: 0`, `time_bounded`
requires a finite positive day count, and `unknown` requires null days and is
denied by default. `provider_default` records the documented account default
and is eligible only when explicitly listed by trusted policy and bounded by
its maximum-day rule.

### 8.4 Semantic judge envelope and adapter

```ts
type JudgeRunStatus =
  | "not_run"
  | "succeeded"
  | "partially_succeeded"
  | "failed";

type JudgeRunReasonCode =
  | "not_requested"
  | "disabled_in_runtime"
  | "no_candidates"
  | "provider_not_configured"
  | "provider_unavailable"
  | "runtime_context_unverified"
  | "isolation_requirement_unmet"
  | "data_handling_requirement_unmet"
  | "invocation_budget_rejected"
  | "preflight_cost_rejected"
  | "some_attempts_failed"
  | "all_attempts_failed";

interface JudgeRunSummary {
  run_status: JudgeRunStatus;
  reason_code: JudgeRunReasonCode | null;
  requested: {
    provider_config_id: string | null;
    provider_config_safety_digest: string | null;
    provider_id: string | null;
    route_id: string | null;
    model_id: string | null;
  };
  effective: {
    provider_config_id: string | null;
    provider_config_safety_digest: string | null;
    provider_id: string | null;
    route_id: string | null;
    route_maturity: CapabilityMaturity | null;
    model_id: string | null;
  };
  capabilities: ExecutedProviderCapability[];
  document_budget: DocumentProviderBudget | null;
  invocation_budget: InvocationProviderBudget | null;
  process_session_budget: ProcessSessionBudgetSnapshot | null;
  execution_provenance: ExecutionProvenance[];
  fallback_transitions: FallbackTransition[];
  fallback_used: boolean;
  diagnostics: Diagnostic[];
}

interface TextJudgeRequest {
  schema_version: "design-0";
  document_id: string;
  candidates: Array<{
    candidate_id: string;
    segment_id: string;
    trigger_finding_ids: string[];
    trigger_rule_ids: string[];
    target_range: SourceRange;
    context_range: SourceRange;
    target_text: string;
    bounded_context: string;
  }>;
  voice_examples: Array<{
    example_id: string;
    class: "good" | "bad";
    text: string;
  }>;
  rubric: { id: string; version: string; digest: string; text: string };
}

interface ProviderExecutionPlan {
  provider_config_id: string;
  provider_config_safety_digest: string;
  provider_id: string;
  route_id: string;
  model_id: string | null;
  max_input_characters: number;
  max_input_tokens: number;
  max_voice_examples: number;
  max_voice_example_characters: number;
  max_output_tokens: number;
  deadline_ms: number;
  preflight_cost_bound: PreflightCostBound | null;
}

interface SemanticJudgment {
  candidate_id: string;
  label_id: string;
  explanation: string;
  evidence_ranges: Array<{
    start_in_target: number;
    end_in_target: number;
  }>;
}

interface TextJudgeInvocationResult {
  judgments: SemanticJudgment[];
  execution_provenance: ExecutionProvenance;
  diagnostics: Diagnostic[];
}

interface TextJudgeProvider {
  readonly descriptor: ProviderDescriptor;
  judge(
    request: TextJudgeRequest,
    plan: ProviderExecutionPlan
  ): Promise<TextJudgeInvocationResult>;
}
```

The M0 schema represents the four summary states as closed `oneOf` branches.
`not_run` uses exactly one of `not_requested`, `disabled_in_runtime`,
`no_candidates`, `provider_not_configured`, `provider_unavailable`,
`runtime_context_unverified`, `isolation_requirement_unmet`,
`data_handling_requirement_unmet`, `invocation_budget_rejected`, or
`preflight_cost_rejected`; its effective tuple is entirely null, provenance is
empty, and the budget is either null or a rejected preflight plan.
`no_candidates` is the normal requested-but-not-applicable path and consumes no
provider quota. `succeeded` has a null reason. `partially_succeeded` uses only
`some_attempts_failed` and requires at least one successful and one
failed/degraded attempt. `failed` uses only `all_attempts_failed`, has at least
one failed execution-provenance entry, and leaves the singular effective tuple
entirely null because no attempt supplied accepted judgments.

For `succeeded` and `partially_succeeded`, all effective identity fields are
non-null except an explicitly model-less route's `model_id`; they exactly match
the one execution-provenance entry that supplied the accepted judgments. When
a fallback wins, they therefore identify the fallback attempt. Voice Lint does
not merge accepted judgments from multiple attempts into one summary; other
attempts remain visible only as provenance and transitions. A successful or
partial state with no such accepted attempt is schema-invalid.
`fallback_used` is true exactly when a transition in `fallback_transitions`
succeeded. Each `ExecutionProvenance` describes one provider attempt; the judge
envelope orders those attempts and transitions without pretending that one
provider's data-handling evidence applies to another.

For a single-document call, the judge serializes both its
`document_budget` and the enclosing `invocation_budget`, so distinct per-
analysis and per-invocation money ceilings remain auditable. In a
multi-document batch, each document judge carries only its deterministic
`document_budget` slice, its `invocation_budget` is null, and the batch envelope
carries the one aggregate `provider_budget`. This lets users audit configured
maxima, worst-case reservation, and actual requests, quota units, and cost
without presenting each document as an independent spending allowance. Zero
document/request/cost/quota limits deny semantic execution rather than mean
unlimited; all enabled limits must be finite and positive. Deterministic
analyzers remain available when the judge plan is rejected.

A direct one-shot CLI run uses a null `process_session_budget`. Connected
provider work through either `voice-lint serve` or the owner-bound stdio MCP
process additionally requires positive process-session request/quota limits
and, for a paid or possibly paid route, a positive
`max_paid_cost_per_process_session`. The process atomically reserves worst-case
units before accepting concurrent work and never lets outstanding plus consumed
reservations exceed a session limit; unused conservative reservations may stay
consumed. Each result returns an opaque session budget snapshot without any
account or token identifier. Exhaustion latches provider work off until the
user explicitly starts a new process; deterministic analysis continues.

Every semantic judgment must echo one planned `candidate_id`; unknown or
duplicate IDs fail result validation. More precisely, the provider returns only
`SemanticJudgment`: a candidate ID, one label from the trusted rubric's closed
label registry, a bounded plain-text explanation, and target-relative evidence
ranges. It cannot supply a `Finding`, rule ID, category, dimension, severity,
origin, disposition, or policy eligibility. Voice Lint verifies the candidate,
label, range, rubric ID/version/digest, and then maps them locally through the
trusted rubric/rule registry. Target text and bounded context are separate so
source mapping is unambiguous. Voice examples are optional, carry opaque IDs
and `good`/`bad` classes, and are bounded independently; they may be sent only
when the disclosure manifest, profile-corpus consent, and provider plan all
include them.

Every M4 provider-derived finding is `advisory` regardless of its display
severity and cannot affect policy or a blocking exit code. Promotion to
`eligible` is a later, explicit schema/evaluation milestone, not an adapter
setting. Prompt-injected content that asks for an error finding, another
candidate, or a policy change is rejected as untrusted output.

`rubric.digest` and `semantic_provenance.rubric_digest` use lowercase
`sha256:<64 hex>` over canonical UTF-8 for the complete trusted rubric package:
prompt text, closed label registry, and every local label-to-rule/category/
dimension/severity/eligibility mapping. The ID/version/digest tuple is
registered before planning and immutable for the run; a mismatch invalidates
the judgment rather than silently changing the mapped finding.

## 9. Provider selection and fallback

Provider selection is explicit in the trusted runtime configuration. The safe
defaults are:

```yaml
allow_provider_fallback: false
allow_paid_fallback: false
fallback_targets: []
```

```ts
interface FallbackTarget {
  target_id: string;
  provider_config_id: string;
  provider_id: string;
  route_id: string;
  model_id: string | null;
  recipient_id: string;
  data_path: DataPath;
  allowed_billing_sources: BillingSource[];
}
```

The flags answer different questions:

- `allow_provider_fallback` permits any Voice-Lint-initiated switch away from
  the primary provider configuration or route, even when the vendor/provider ID
  stays the same. Such a switch can change auth, billing, deployment, data
  policy, or recipient and therefore requires explicit consent and a matching
  entry in `fallback_targets`.
- `allow_paid_fallback` permits a fallback execution whose verified or possible
  billing source can incur usage charges or overage.

Neither flag permits an initial paid or possibly paid request, including a
subscription route with possible overage. That requires separate primary cost
authorization, an explicit currency, and positive per-analysis and
per-invocation ceilings in trusted runtime configuration. Before sending text,
the adapter establishes a conservative upper bound using a provider-enforced
limit or pinned model pricing plus hard input/output-token caps. A
provider-reported value returned only after inference is accounting evidence,
not a preflight ceiling. If the adapter cannot prove the requested upper bound,
paid execution is unavailable.

Before the first document in a CLI/MCP batch is disclosed, the planner also
reserves the worst-case sum for all eligible documents, repairs, and the single
authorized fallback per document. That sum must fit `max_paid_cost_per_invocation`; the plan
must also fit positive `max_documents_per_invocation`,
`max_requests_per_invocation`, and each configured quota-unit limit. AI
credits, legacy premium requests, requests, and provider-defined units are
tracked independently. Every unit carries a conservative preflight reservation
derived from an official enforced cap or immutable version-pinned usage rule;
the sum must fit its maximum. Unknown unit conversion or variable credit weight
never counts as free. A plan that cannot prove all aggregate bounds is rejected
before any document is sent, rather than spending one per-document allowance
repeatedly.

A paid or possibly paid fallback target requires both flags. Paid fallback is not implied
by `byok_cloud`, and provider fallback is not implied by `personal_cloud`. If billing
cannot be verified, the candidate is treated as possibly paid.

Enabling either flag while `fallback_targets` is empty authorizes no target.
Before a transition, the planner matches the exact provider configuration,
provider, route, model, recipient, data path, and billing source to one target
ID and records that ID in `FallbackTransition`. The route tuple therefore also
fixes auth, deployment, structured-output, isolation, persistence, and maturity
properties. Voice Lint 0.x permits at most one fallback transition per
document: the planner deterministically chooses at most one eligible target,
does not chain target-to-target or retry another target, and rejects cycles. A
paid or possibly paid transition additionally needs a positive
analysis ceiling and its own preflight bound under the same aggregate
`max_paid_cost_per_analysis`; reserved bounds for the primary call, repair, and
the single possible fallback may not exceed that ceiling.

`outcome: not_attempted` requires `attempted: false`,
`not_attempted_by_policy`, empty disclosure IDs, zero usage, and no cost bound.
Every other outcome requires `attempted: true`. `succeeded` requires a null
outcome reason, an allowlist target ID, one or more disclosure IDs for the
target attempt, and a matching successful execution-provenance entry. A
pre-disclosure `rejected` transition has a denial reason and no disclosure or
usage; `failed` has a target-failure reason, may have disclosure/usage, and must
resolve them to the attempted route. Trigger and target outcome are never
collapsed into one ambiguous code.

`allow_provider_fallback` means any Voice-Lint-initiated change of provider
configuration or route. An automatic model change within the same route is not supported in 0.x; a
user selects a new model in trusted runtime configuration and starts a new run.
If the vendor itself resolves an alias or changes the effective model, Voice
Lint records the mismatch and verification state rather than calling it a
Voice Lint fallback.

Without the relevant permission, timeout, quota exhaustion, malformed output,
or unavailable authentication yields `rules_only` or another reduced-coverage
result. The response identifies which capability was unavailable.

A single structured-output repair may be attempted on the exact same provider
configuration, route, and model when configured. It is not a fallback, but it is another
model request, counts toward usage and cost limits, appears as
`repair_attempt_count: 1`, and is never repeated recursively.

## 10. Personal adapters and multi-user boundaries

Personal subscription adapters use only provider-documented CLIs or SDKs and
only routes their terms explicitly support. Voice Lint must not scrape browser
cookies, copy refresh tokens, read private credential databases, or replay
undocumented network calls.

At startup, a personal adapter verifies all facts it can safely establish:

- the executable and supported non-interactive mode;
- the effective client version;
- that project instructions and all provider tools are disabled through the
  documented, version-matched route configuration;
- that the process runs as the same local OS user;
- that the Voice Lint API is loopback-only.

If effective isolation cannot be verified, the adapter fails closed and the run
continues at reduced coverage. A requested command-line flag is not itself proof
that isolation was achieved.

Personal adapters are not accepted in any CI environment, a shared runner or
container, a daemon used by multiple users, a hosted service, or an account
pool, even when the CI runner belongs to one person.
Positive `local_single_user` evidence means the current foreground CLI,
owner-authenticated loopback instance, or directly launched owner-bound stdio
MCP process and its provider child, runtime directory, inherited pipe or
session token, and instance lease all resolve to the same verified OS user;
forwarded headers, proxying, and shared brokers are absent; no non-loopback bind
or shared credential mode is active; and CI/container indicators are absent. Mere
absence of one environment variable is insufficient. If ownership, ACL/mode,
process identity, bind, or deployment context cannot be verified on the
platform, the personal route is unavailable with
`local_single_user_unverified`.

Before sending text, the adapter also establishes its local history behavior,
provider retention/training policy, and telemetry behavior from
version-matched official controls or metadata. Initial personal routes require
an ephemeral/no-history client mode; a client that may persist raw prompts or
responses locally is not eligible. Provider-side retention, training use, and
telemetry are disclosed and matched to trusted runtime consent. Unknown facts
never silently inherit the most private value, and unmet requirements fail
closed before disclosure.
Future multi-user support requires an official per-user authorization flow,
tenant isolation, per-user audit/provenance, and a dedicated threat-model
review. It is outside the MVP.

## 11. Child-process isolation

Official CLIs and local analyzers run behind narrow adapters:

1. Spawn with `shell: false` and a fixed executable plus argument array. Never
   interpolate document text into a command string.
2. Use stdin or a documented temporary input file for content. Use stdout only
   for the declared protocol and stderr for bounded diagnostics.
3. Create a fresh, permission-restricted temporary working directory with no
   repository checkout, user project configuration, or inherited current
   directory. Remove it after the process tree exits.
4. Construct a child environment from an allowlist; never clone the complete
   parent environment.
5. Apply wall-clock timeout, idle timeout, input bytes, output bytes, result
   count, memory where supported, and process-count limits.
6. On timeout or cancellation, terminate the full child process tree and report
   a typed execution result.
7. Reject unexpected tool-call events, file references outside the temporary
   directory, extra protocol frames, invalid JSON, and trailing executable
   instructions.

### 11.1 Environment allowlist

The base child environment contains only values needed to start the selected
tool, for example a minimal `PATH`, OS temporary-directory variables, locale,
and vendor runtime variables documented as necessary. Vendor-specific variables
are added only for the selected adapter.

Subscription mode explicitly excludes API and cloud billing credentials unless
that exact credential mode was selected. The deny set includes, at minimum:

```text
OPENAI_API_KEY
CODEX_API_KEY
ANTHROPIC_API_KEY
ANTHROPIC_AUTH_TOKEN
GEMINI_API_KEY
GOOGLE_API_KEY
AZURE_OPENAI_API_KEY
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_SESSION_TOKEN
GOOGLE_APPLICATION_CREDENTIALS
```

Equivalent vendor and cloud variables are denied by maintained patterns and
adapter tests. A secret required by one selected adapter is never passed to
another. Project-specific instruction variables, plugin paths, shell startup
hooks, proxy variables, and tracing exporters are excluded unless a documented
adapter requirement and threat review approve them.

Where an official client supports it, the adapter requests non-interactive
execution, disables tools, ignores project instructions, selects structured
output, and uses read-only or ephemeral workspace permissions. If the effective
behavior cannot be checked, the personal adapter is unavailable rather than
quietly running with broader access.

Separate processes and local services improve crash containment,
replaceability, dependency isolation, and license-boundary clarity. They do not
make an untrusted binary safe, and they do not by themselves satisfy
redistribution, linking, notice, source-offer, or network-copyleft obligations.
Every bundled or recommended engine still needs a recorded license review.

## 12. Coverage, scoring, and policy

### 12.1 Coverage is first-class

Coverage describes which requested capabilities produced trustworthy results.
The canonical result keeps the overall value in `summary.coverage`, each
dimension value in `dimensions.<id>.coverage`, and per-engine evidence in the
top-level `engine_runs` array:

```ts
type EngineRunReasonCode =
  | "not_selected"
  | "disabled_in_runtime"
  | "dependency_unavailable"
  | "resource_limit_rejected"
  | "input_not_applicable"
  | "language_not_supported"
  | "format_not_supported"
  | "capability_not_supported"
  | "execution_failed"
  | "timeout"
  | "invalid_engine_output";

interface EngineRunBase {
  engine_id: string;
  engine_version: string | null;
  capabilities: string[];
  diagnostics: Diagnostic[];
}

type EngineRunSummary = EngineRunBase & (
  | {
      execution_state: "evaluated";
      reason_code?: never;
      affects_coverage: true;
      coverage: number;
      execution_provenance: AnalyzerExecutionProvenance;
    }
  | {
      execution_state: "not_applicable";
      reason_code: "input_not_applicable";
      affects_coverage: false;
      coverage: null;
      execution_provenance: AnalyzerExecutionProvenance | null;
    }
  | {
      execution_state: "not_run";
      reason_code: "not_selected";
      affects_coverage: false;
      coverage: null;
      execution_provenance: null;
    }
  | {
      execution_state: "not_run";
      reason_code:
        | "disabled_in_runtime"
        | "dependency_unavailable"
        | "resource_limit_rejected";
      affects_coverage: true;
      coverage: 0;
      execution_provenance: null;
    }
  | {
      execution_state: "unsupported";
      reason_code:
        | "language_not_supported"
        | "format_not_supported"
        | "capability_not_supported";
      affects_coverage: true;
      coverage: 0;
      execution_provenance: null;
    }
  | {
      execution_state: "failed";
      reason_code: "execution_failed" | "timeout" | "invalid_engine_output";
      affects_coverage: true;
      coverage: 0;
      execution_provenance: AnalyzerExecutionProvenance | null;
    }
);

interface AnalyzerContentDisclosure {
  content_scope: "selected_segments";
  characters_disclosed: number;
}

type AnalyzerExecutionProvenance =
  | {
      runtime_mode: "strict_offline" | "local_connected";
      deployment_scope: "in_process" | "local_process";
      data_path: "on_device";
      recipient_id: "local_device";
      content_disclosure: null;
      loopback_transport: null;
      sidecar_egress_verification: "not_applicable";
    }
  | {
      runtime_mode: "local_connected";
      deployment_scope: "loopback_service";
      data_path: "loopback_local_service";
      recipient_id: string;
      content_disclosure: AnalyzerContentDisclosure | null;
      loopback_transport:
    | {
        kind: "http_loopback";
        endpoint_config_id: string;
        authority_class: "ipv4_loopback_literal" | "ipv6_loopback_literal";
        redirects_disabled: true;
        proxies_disabled: true;
        dns_used: false;
        peer_loopback_verified: true;
        response_urls_ignored: true;
      }
    | {
        kind: "local_ipc";
        endpoint_config_id: string;
        peer_owner_verified: true;
        path_disclosed: false;
      };
      sidecar_egress_verification: "not_verified_by_voice_lint";
    };
```

The evaluated branch requires `0 < coverage <= 1`; a zero-trustworthy-output
run is `failed`, not evaluated. `not_selected` is the only non-applicable
selection state and never enters the denominator. A selected applicable engine
that is disabled, unavailable, or rejected before execution enters the
denominator with zero coverage. Unsupported and failed selected engines also
enter with zero. `not_applicable` never enters the denominator. The generated
JSON Schema encodes these branches and the numeric range with `oneOf`, so a
reason, state, denominator flag, and coverage value cannot be recombined.

Unavailable configured, applicable checks lower coverage; they do not silently
award perfect quality. An optional check that was not selected does not enter
the denominator.
`engine_runs` includes evaluated engines and relevant disabled, skipped,
unsupported, or failed engines with their execution state and reason. Scores
from materially different coverage are not presented as equivalent. If
coverage is below the scoring floor, the numeric value is `null` and its
independent status is `insufficient_coverage`; the field is not silently
omitted. A dimension with no applicable checks has `coverage: null`. If every
dimension is not applicable, summary `coverage` is also `null` rather than a
division by zero.

Every evaluated engine has non-null execution provenance. A connected engine
also has non-null provenance whenever it opened its configured socket/IPC
boundary or began a text transfer, even if its final execution state is
`failed`; a timeout or malformed response must not erase a real connection or
disclosure. `content_disclosure` is non-null exactly when one or more characters
were sent and reports their positive aggregate count. The connected tuple's
`recipient_id` is a configured non-empty sidecar identity and cannot use the
reserved `local_device` value. The discriminated union rejects strict-offline
sidecars, on-device loopback claims, missing connected transports, and sidecar
egress claims stronger than `not_verified_by_voice_lint`. The transport object proves Voice
Lint's redirect/proxy/DNS/peer controls; it does not assert that a user-managed
sidecar itself lacks egress. Null provenance is allowed only for a safely
pre-execution `not_run`, `not_applicable`, or `unsupported` state, or for a
failure proven to occur before any execution boundary, connection, or text
transfer. Contract tests cover post-disclosure failure and timeout paths.

### 12.2 Quality score

Before M5 language-specific calibration, every dimension score,
`quality_score`, and `slop_risk` is `null`. Dimensions use
`score_status: uncalibrated`; the independent aggregate fields use
`quality_score_status: uncalibrated` and
`slop_risk_status: uncalibrated`. Findings, raw measurements, dimension
status, and coverage are still returned.

Configured numeric targets are returned in a separate `targets` object with
`status: unavailable` and a stable reason code until the corresponding score
is available. Target state never substitutes for score state.

```ts
interface NumericTargetState {
  warn_below: number;
  status: TargetStatus;
  reason_code: TargetUnavailableReason | null;
}
```

`met` and `below` require an available score and therefore have a null reason.
An unavailable target maps its score status to exactly one of the four closed
reason codes. A `below` target makes `analysis_status` a non-blocking `warning`
when policy otherwise passes; `unavailable` alone does not.

After compatible calibration exists and coverage is sufficient, each quality
dimension derives from normalized, actionable findings and explicit document
metrics. The aggregation algorithm, weights, caps, calibration, and engine
versions are returned or addressable by version so the score is reproducible
for deterministic runs.

AI-origin likelihood is neither a quality dimension nor a score penalty.

### 12.3 Required coverage is declarative

A safe profile may require only closed capability and dimension IDs. It cannot
name an executable, provider, endpoint, credential, or runtime mode:

```ts
interface PolicyEvaluation {
  fail_on: FindingSeverity;
  minimum_coverage: number;
  required_capabilities: string[];
  required_dimensions: string[];
  unmet_requirements: Array<{
    kind: "capability" | "dimension" | "overall_coverage";
    id: string;
    reason_code: string;
    coverage: number | null;
  }>;
}
```

A required capability is met when an applicable selected engine declaring that
capability completed successfully. Every required dimension and overall
coverage must be non-null and at least `minimum_coverage`. Otherwise
`policy_status` is `not_evaluated`, `analysis_status` is `incomplete`, the
unmet requirement is serialized, and the CLI returns `4`. A CLI
`--require-capability` may add a requirement for the current run but cannot
enable the capability.

### 12.4 No score-only blocking

`warn_below_quality_score` may produce a warning or dashboard signal, but it cannot
alone produce a publication `fail`. A blocking policy requires:

- one or more actionable findings tied to an explicit rule;
- a source location or document-level evidence reference;
- an explanation and remediation path;
- sufficient coverage for every capability on which the blocking rule depends.

Engine failure or required-capability absence produces `incomplete`, not an
editorial `fail`. CI may use a distinct nonzero exit code for infrastructure or
incomplete-analysis policy, but must not mislabel it as bad writing.

## 13. Caching, logging, and reproducibility

Persistent caching is disabled by default in every mode. The default run keeps
only bounded in-memory state and releases it at completion.

Default privacy rules:

- do not log or persist source text, prose segments, prompts, model responses,
  evidence excerpts, credentials, bearer tokens, or provider account details;
- do not place raw text in exception messages, tracing attributes, process
  arguments, temporary filenames, or metrics labels;
- do not write unsalted hashes of source text to logs, caches, telemetry, or
  provenance because they enable dictionary and cross-workspace correlation;
- redact provider errors and bound stdout/stderr before returning them;
- disable third-party telemetry in child tools where officially supported.

An opt-in persistent cache requires a user-owned local cache policy specifying
scope, retained fields, maximum size, retention time, and deletion behavior.
Content-derived keys use a keyed HMAC with a locally generated secret or a
user-selected isolated workspace key. Public tool/configuration digests may use
ordinary hashes; source-content digests may not. Cache files use owner-only
permissions where the OS supports them, and a `voice-lint cache purge` operation removes
entries and rotates the key.

Opting into deterministic result caching does not permit storage of prompts,
raw provider responses, excerpts, or full findings. Semantic caching is absent
from M4 and all current 0.x contracts; a future ADR would need distinct
cache-hit provenance, immutable origin references, complete safety-keying,
eligibility revalidation, and retention consent before such a scope exists.

Deterministic `strict_offline` analysis is expected to be byte-stable for the
same source bytes, profile, configuration, locale, schemas, and pinned engine
versions. Responses use stable ordering and exclude timestamps or random IDs
from the deterministic comparison envelope.

## 14. AI-origin assessment

AI-origin estimation is a separate, optional post-MVP module with the closed
contract defined in [AI-origin signal](ai-origin-signal.md). The only public
statuses are `not_run`, `unsupported`, `insufficient_evidence`, `available`,
and `failed`; only `available` can carry a calibrated ordinal risk band.
The first 0.x backend is restricted to a pinned local-child
detector with no sockets or runtime model download. Its public object records
`strict_offline`, `on_device`, local recipient, backend scope, version, and
verified backend/model, model-card, calibration-package, and evaluation-card
artifact digests.
Cloud AI-origin detection requires a future contract and threat review; it is
not an eligible 0.x backend.

A repository profile cannot enable or configure the module. It requires both a
trusted runtime backend selection and an explicit current-request opt-in
alongside at least one quality check; AI-only requests are invalid before any
analysis runs. Throughout the `0.x` contract it cannot change findings,
dimensions, quality/SLOP scores, policy,
analysis status, SARIF severity, or exit codes. In detected CI it does not run
and returns `not_run` with `disabled_in_ci_0x`. There is no unsafe override.

The public object exposes no generic detector confidence or authorship
probability. It reports detector/calibration versions, evaluated length,
language/domain gates, reason codes, limitations, and abstention. Product copy
must never label a person as a cheater or establish human/AI authorship from
this signal.

## 15. Loopback HTTP API security

The MVP server binds only to explicit loopback literals and refuses a wildcard,
LAN, or public bind even if requested in configuration. Localhost is still a
security boundary: browsers, extensions, and other local processes can send
requests to it.

### 15.1 Authentication and browser boundary

- Generate a cryptographically random bearer token with at least 128 bits of
  entropy for each server start.
- Deliver the token through inherited process IPC or a temporary owner-only
  runtime file. For an explicit file path, atomically create its parent runtime
  directory and file; require POSIX modes `0700` and `0600`, respectively, or
  a Windows DACL limited to the current user. Reject an existing unsafe file,
  symlink, junction/reparse-point traversal, wrong ownership, or permissions
  that cannot be verified. Never put the token in a URL, query string, log,
  error, HTML page, or process title. Rotate it on restart and remove its
  runtime file on normal shutdown, with stale-file cleanup tested after a
  crash.
- Require `Authorization: Bearer ...` for every endpoint except an optional
  minimal `/healthz` that returns only liveness and no version, provider,
  account, path, or configuration detail.
- Do not use cookies for API authentication.
- Parse `Host` and require an exact configured loopback authority such as
  `127.0.0.1:43117` or `[::1]:43117`. Reject suffix matches, arbitrary hostnames,
  alternate ports, user-info syntax, and values that merely resolve to
  loopback. This blocks DNS-rebinding assumptions.
- If `Origin` is present, require an exact trusted local origin configured by
  the user. Reject nonlocal, unknown, wildcard, and `null` origins. A
  non-browser client without `Origin` is accepted only with the bearer token.
- Emit no CORS allow headers by default. CORS is not authentication.

### 15.2 Request surface

- Use JSON with an exact supported `Content-Type` and explicit schema version.
- Use `POST` for analysis and every state-changing action; `GET` endpoints are
  side-effect free.
- The analysis endpoint accepts `profile_id`, never `profile_path` or an
  arbitrary configuration object. A separate validation endpoint may accept an
  inline, path-free `VoiceProfileDraft`, validates it against a closed schema,
  and never executes analysis or grants runtime authority. That draft schema
  forbids corpus-path fields; full profiles with relative example directories
  are validated only by the local CLI.
- Accept direct text only in the core MVP. File and directory traversal remains
  a CLI concern; HTTP requests cannot enable it or submit paths.
- Never accept a provider endpoint, model, credential reference, command,
  runtime mode, fallback flag, or cache enablement from an HTTP request.
- Return plain JSON. Escape any later HTML/Markdown rendering and set
  `X-Content-Type-Options: nosniff`.

A future file-analysis endpoint requires a separate path-security ADR,
pre-registered roots, verified real-path containment, and dedicated tests. It
is not part of the core HTTP contract.

### 15.3 Resource and provider limits

The server applies bounded defaults before reading a full body:

| Limit | Proposed MVP default |
|---|---:|
| request body | 1 MiB |
| documents per request | 1 |
| concurrent analyses | 2 |
| queued analyses | 8 |
| analyzer wall-clock timeout | 30 seconds |
| semantic calls per analysis | 3 total: 1 primary, at most 1 repair, and at most 1 call on the single authorized fallback route |
| returned findings | 1,000 |
| captured child stdout and stderr | 1 MiB each |

Trusted local configuration may lower these values and may raise them only up
to compiled safety ceilings. Provider-specific request, token, rate, and
preflight cost bounds are enforced independently. Connected provider use also
requires finite positive invocation and process-session request/quota limits
for both loopback HTTP and owner-bound stdio MCP;
possibly paid use requires corresponding money ceilings. Reservations are
atomic across concurrent requests. A queue overflow, timeout, budget
exhaustion, or quota event returns a typed execution error without exposing
content or secret material.

Security-relevant response headers disable caching and framing. Error responses
do not include local paths, excerpts, child environments, commands, provider raw
responses, or stack traces.

## 16. Agent and editor integrations

Integrations use the same loopback API or invoke the CLI as a bounded child. No
integration gets a privileged path around runtime planning.

The 0.x MCP transport for personal adapters is owner-bound stdio only: a local
orchestrator/editor directly launches Voice Lint, all inherited handles and
processes resolve to the same verified OS user, and no CI, container, proxy,
shared broker, remote transport, or reused multi-user daemon is present.
Streamable HTTP/SSE MCP cannot use personal credentials. A qualifying stdio MCP
process enforces and reports the same atomic `process_session_budget` as the
loopback server; an unverifiable context reduces the result to eligible local
engines.

An agent-facing result has two layers:

1. a short human-readable summary suitable for Markdown; and
2. the complete schema-validated JSON result, including findings, coverage,
   policy outcome, analyzer run summaries, AI-origin assessment, and execution
   provenance.

The integration must preserve findings and coverage even when it displays a
single headline score. It may request a stricter subset of enabled analyzers,
but cannot select a broader mode, provider, fallback, endpoint, or credential.

## 17. Verification strategy

Architecture contracts need executable tests before an MVP is called complete:

- schema fixtures reject camelCase fields, profile execution keys, arbitrary
  paths, unknown enum values, and ambiguous status fields;
- network-denial tests assert no socket attempts from the `strict_offline` CLI
  process, and no analyzer/provider socket attempts when the same engine mode
  is reached through the already-listening loopback API;
- owner-bound stdio MCP tests prove `strict_offline` opens no socket in the MCP
  process or analyzers, and `personal_cloud` can start only the exact planned
  provider child under the atomic process-session budget;
- endpoint tests reject DNS rebinding hosts, hostile origins, missing bearer
  tokens, CORS preflights, oversized bodies, and non-loopback binds;
- child-process tests inspect the effective environment, working directory,
  argument vector, process-tree cleanup, timeout, and output limits;
- disclosure tests verify candidate/context separation, bounded voice examples,
  one manifest per actual semantic recipient, and connected-analyzer character
  disclosure without echoing content;
- provider-route tests reject invalid auth/deployment/data-path/billing/
  isolation cross-products and preview capability maturity mismatches;
- fallback tests prove both flags default to `false`, require an exact trusted
  provider-config/route target, separate trigger/outcome codes and recipient
  manifests, reject chains/cycles, and require both permissions for a paid or
  possibly paid fallback target;
- repair/fallback injection tests prove that raw provider output and
  text-bearing validation errors are never forwarded to the same or another
  recipient;
- budget tests cover immutable price evidence, per-analysis and
  invocation/batch reservations, request/document/credit unit caps,
  provider-verification authorization, and atomic process-session exhaustion
  for loopback HTTP and owner-bound stdio MCP;
- verification-lifecycle tests cover static no-inference behavior, behavioral
  canary non-authority, result digests, version/config mismatch, expiry,
  disclosure, and separate quota/cost accounting;
- personal-route tests fail closed for CI, containers, proxies, shared service,
  wrong user/ACL, unverifiable local context, restricted tools, local client
  history, or disallowed/unknown retention and training policy;
- loopback-adapter tests reject redirects, proxy environments, DNS names,
  non-loopback peers, response-supplied URLs, and prove that public provenance
  contains no IPC filesystem path;
- source-map golden tests cover Vale original markup, native `DocumentModel`
  findings, LanguageTool segment offsets, emoji, combining marks, CRLF, and
  Markdown constructs;
- cache tests prove the default writes nothing persistent and never emits an
  unsalted content hash;
- policy tests prove a score alone cannot block and engine failure maps to
  `incomplete`, not editorial `fail`;
- reproducibility fixtures compare the deterministic response envelope byte for
  byte with pinned versions.
- AI-origin child tests verify backend/model artifact digests, the shared child
  isolation controls, no persistence, no sockets/downloads, additive-only
  invocation, and policy/exit-code independence.

## 18. Open decisions

The following decisions remain intentionally open and should become ADRs rather
than accidental implementation details:

1. Final source-position encoding and line/column semantics (`ADR-0001`, needed
   before M0 schema freeze).
2. The initial set of document formats and parser libraries.
3. Which local LanguageTool packaging option meets performance, distribution,
   and license requirements on each supported OS.
4. Which personal provider clients expose sufficient official non-interactive,
   tool-isolated, and billing/provenance signals to qualify.
5. The evidence and evaluation threshold required before any AI-origin engine
   can be offered, including language-specific abstention behavior.
6. Whether an opt-in semantic cache is valuable enough to justify its privacy,
   invalidation, and deletion complexity.

These open decisions do not weaken the trust boundaries, offline contract,
fallback defaults, loopback security, or no-score-only-blocking rule defined
above.
