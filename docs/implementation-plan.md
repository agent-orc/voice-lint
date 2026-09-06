# Implementation plan

Status: proposed execution plan

Priority update, 2026-09-06: the operator's immediate product is an embeddable
JavaScript review library and a local Voice Studio host for websites and
Markdown. [P1–P6](on-page-review.md#8-delivery-order-and-ownership) define its
delivery sequence, including a real feedback/persistence trial after P2 and a
proposal-to-source workflow after P4. The M0–M6 programme below remains the
broader analyzer plan; its full completion is not a prerequisite for that
pilot. Review-service writes are an explicit extension, not a silent expansion
of M3's direct-text API. All capabilities remain proposed.

Milestones describe dependency order, not calendar commitments.

The Core MVP is exactly M0 through M3. M4 is a post-Core-MVP semantic beta, M5 activates calibrated scores, and M6 is a separate experimental AI-origin track.

Execution modes are explicit:

- `strict_offline`: the M1 CLI path; Vale and native TypeScript metrics only, with no listening or outbound sockets;
- `local_connected`: an M2 opt-in that may call only an explicitly configured loopback LanguageTool sidecar;
- semantic provider modes: post-Core-MVP M4 beta paths using `local_connected` for a loopback local model, `personal_cloud` for a local single-user subscription client, and `byok_cloud` for an explicit API credential. A shared service remains a separate deployment boundary.

The M3 HTTP server necessarily opens its own loopback listener. A `strict_offline` analysis requested through that server means the analysis engine opens no additional or outbound socket; only the M1 CLI can make the stronger process-wide “no sockets” claim.

## Implementation strategy

Build the smallest complete offline path before adding model providers:

~~~text
strict_offline Markdown file
  → source-aware parsing
  → Vale rule worker
  → native transparent metrics
  → normalized findings
  → policy
  → text and JSON CLI output
~~~

M1 also establishes the minimal profile loader and init/validate workflow needed
by that path. Then M2 adds profile inheritance, baselines, and
`local_connected` grammar, and M3 adds secure API transports to finish the Core
MVP. Semantic providers, calibrated scoring, and experimental AI-origin signals
remain later, separate milestones.

## Proposed stack

| Concern | Initial choice | Reason |
|---|---|---|
| Runtime | Node.js Active LTS | Cross-platform CLI/server and current provider SDK support |
| Language | TypeScript, strict mode | Shared contracts across CLI, HTTP, MCP, and adapters |
| Workspace | pnpm | Independent packages with one lockfile |
| Contracts | JSON Schema plus generated types | Language-neutral API and fixture validation |
| Testing | Fast unit runner plus black-box CLI tests | Rules need cheap fixtures; transports need process-level tests |
| Rule engine | Pinned Vale worker | Mature markup-aware rule system without rebuilding it |
| Grammar | Pinned LanguageTool sidecar in `local_connected` | Strong shared German and English baseline without weakening `strict_offline` |
| Metrics | Small native metrics; textstat as a comparison oracle | Transparent and separately calibratable without a Python runtime dependency |
| HTTP | Small framework with generated OpenAPI | Loopback API without a large application platform |
| MCP | Official TypeScript SDK | Narrow agent-facing tools |
| Release | Scoped npm package first, standalone binaries after spike | Fast iteration before packaging complexity |

M0 must validate TypeScript packaging on Windows, macOS, and Linux. If the provider and German NLP spikes demonstrate a decisive Python advantage, record an architecture decision before implementation spreads across packages.

## M0 — repository, contracts, and evaluation foundation (Core MVP)

**Current status: in progress.** This repository currently contains the prose
design, research, examples, license, and project-governance documents. The
workspace, schemas, generated types, accepted ADRs, automated checks, and CI
listed below are still pending, so M0 is not complete.

### Deliverables

- Apache-2.0 license and contribution policy.
- pnpm TypeScript workspace.
- formatting, linting, type-checking, unit-test, and documentation checks.
- JSON Schemas for profile, request, single-document and batch results, finding disposition, measurements, diagnostics, targets, policy requirements, comparison metadata, analyzer, provider, and AI-origin signal.
- generated TypeScript types.
- canonical JSON serialization rules.
- initial DE/EN SLOP taxonomy.
- fixture format and human annotation guide.
- architecture decision records for runtime, rule engine, grammar engine, source positions, and execution-mode semantics.
- a Distribution ADR covering third-party acquisition, bundling, containers, automatic downloads, corresponding source, notices, SBOM entries, and release/update procedures.
- CI on Windows, macOS, and Linux.

### Acceptance criteria

- every example JSON and YAML file validates in CI;
- schema compatibility rules are documented;
- Unicode offsets have one documented convention;
- a fixture can express expected and forbidden findings;
- schemas represent `strict_offline`, `local_connected`, uncalibrated score state, provider/auth/billing class, and per-finding engine provenance without calling planned behavior shipped;
- no LanguageTool archive, JAR, image, or downloader is distributed before the Distribution ADR is accepted;
- documentation clearly distinguishes shipped, planned, and experimental behavior.

## M1 — `strict_offline` core alpha (Core MVP)

### Deliverables

- plain-text and Markdown ingestion;
- prose-region extraction with original source mapping;
- language selection for German and English;
- a minimal schema-validated `VoiceProfile` loader, exact current-directory
  default resolution, explicit `--profile` loading, and `profile init` and
  `profile validate` commands;
- a `strict_offline` execution guard that refuses network-backed analyzers and opens no sockets;
- Vale worker process with pinned version;
- explicit generated Vale configuration with repository/user config discovery and runtime package sync disabled;
- VoiceLint-DE and VoiceLint-EN style packages;
- project terminology and phrase rules generated from a profile;
- native TypeScript metrics for sentence length, repetition, headings, lists, and filler;
- finding normalization and overlap de-duplication;
- explicit applicability and coverage plus per-dimension `score_status: "uncalibrated"`, independent `quality_score_status` and `slop_risk_status`, and null aggregate scores;
- text and JSON reporters;
- stable CLI exit codes;
- a run-scoped, non-content-derived analysis ID explicitly outside the deterministic comparison envelope; an optional locally keyed content fingerprint for baseline workflows; and complete version metadata. No plain content hash appears in default output or logs.
- an SBOM and populated third-party notices for every dependency, binary, style pack, and artifact in the first distributable build.

### Rule target

- at least 15 shared SLOP/style rules;
- at least 5 additional German-specific rules;
- at least 5 additional English-specific rules;
- profile-level preferred, avoided, and forbidden terms;
- no rule based only on typography as evidence of AI authorship.

### Acceptance criteria

- the same input, profile, and versions produce a byte-identical canonical deterministic domain payload after excluding documented transport metadata such as `analysis_id`;
- code blocks, inline code, URLs, and Markdown syntax are excluded correctly;
- every finding has rule ID, category, severity, disposition, engine, version, explanation, and source location;
- raw measurements carry a closed unit, applicability state, engine version, and method version and are never relabeled as scores;
- multi-file JSON uses a deterministic batch envelope with scoped document IDs and documented exit aggregation;
- inputs up to 100,000 characters complete within documented resource limits;
- a network-denial test proves that the M1 CLI process creates neither listening nor outbound sockets;
- without `--profile`, exactly
  `<current-working-directory>/.voice-lint/profile.yml` is used; there is no
  upward search, per-input discovery, or built-in default, and a missing file
  returns exit code `2`;
- LanguageTool, Python workers, local-model HTTP endpoints, and cloud providers cannot be selected in `strict_offline`;
- aggregate and dimension scores remain null and cannot drive policy before M5 calibration;
- complete input text is absent from default logs.
- no distributable package is published unless its SBOM, license texts, notices, source obligations, and Distribution ADR procedure are complete.

## M2 — profile inheritance, baselines, and `local_connected` grammar (Core MVP)

### Deliverables

- schema-versioned profile inheritance;
- project good- and bad-example references without semantic analysis yet;
- finding/category/severity `fail-on` policies; numeric `warn_below` targets remain advisory and inactive while scores are uncalibrated;
- baseline creation and changed-since comparison;
- an explicit `local_connected` mode;
- a LanguageTool HTTP adapter restricted to an administrator-configured loopback endpoint;
- a pinned, user-installed local LanguageTool development setup;
- finding de-duplication across Vale, metrics, and LanguageTool;
- per-dimension applicability and coverage.

### Acceptance criteria

- invalid profile paths return structured, actionable errors;
- a missing optional LanguageTool service reduces coverage and emits a warning;
- a required LanguageTool service produces exit code 4 when unavailable;
- selecting LanguageTool without `local_connected` is rejected, and selecting `strict_offline` retains the M1 no-socket guarantee;
- LanguageTool endpoints are configuration-only, loopback-only, and cannot be supplied in an analysis request;
- German variants and English variants are explicit and tested;
- no public free LanguageTool endpoint, automatic download, or bundled artifact is used;
- any future bundled archive, JAR, helper image, or downloader is blocked until the accepted Distribution ADR's release procedure is implemented;
- score values remain null, and configured numeric targets return structured `unavailable` states with stable reason codes;
- profile or ruleset changes appear in the result versions.

## M3 — secure API, MCP, SARIF, and CI (Core MVP)

### Deliverables

- authenticated loopback HTTP server with a per-launch random bearer token delivered only through inherited IPC or an owner-only runtime file and never accepted in a URL;
- bundled `api analyze` client that reads text from a file/stdin and the token
  from the protected runtime file, accepts loopback-literal servers only, and
  disables redirects and proxies;
- OpenAPI document;
- Host-header, origin, and CORS protections for the loopback-literal threat model;
- `runtime init`, `runtime profile register`, and `runtime mcp-root register`
  commands that write only to an explicitly named, user-owned configuration;
- request-size, concurrency, timeout, and MCP configured-root restrictions;
- configuration-only analyzer endpoints; request payloads cannot select a URL, socket, executable, or arbitrary filesystem path;
- SARIF reporter;
- owner-bound stdio MCP server with versioned input/output schemas for analyze,
  validate, explain, compare, and list operations;
- generic MCP client launch example and an Agent Orchestrator direct-CLI recipe;
- pre-commit example;
- GitHub Actions example or dedicated action;
- host-native development and test setup for the loopback API. Containerized
  API deployment belongs to the separate future service/BYOK boundary; the
  personal loopback API and personal subscription credentials are never put in
  a container. A LanguageTool image remains user-managed unless the
  Distribution ADR approves bundling it.

### Acceptance criteria

- CLI and HTTP produce the same canonical per-document domain result; multi-file CLI and MCP operations wrap those unchanged results in the canonical batch envelope;
- the server defaults to `127.0.0.1`, refuses wildcard or non-loopback binds in 0.x, and documents IPv6 loopback behavior;
- analysis endpoints reject missing or invalid bearer authentication;
- hostile Host and Origin values, wildcard CORS, oversized requests, and excess concurrent work are rejected before analysis;
- request-controlled URLs cannot trigger SSRF, and analyzer endpoints come only from trusted startup configuration;
- HTTP analysis accepts direct text only; MCP file access is disabled unless trusted roots are configured and then confines canonical paths, symlinks, and junctions to those roots;
- secrets and complete input do not appear in logs or health output;
- SARIF source positions match the original Markdown file;
- MCP tools expose analysis, not unrestricted model completion;
- the documented POSIX, macOS-fallback, and Windows setup sequences initialize a
  runtime, register a profile, start the server, and complete one authenticated
  request without an undeclared file or environment dependency;
- the stdio start command, client launch object, six tool schemas, structured
  success/error envelopes, root/profile resolution, and `incomplete` handling
  are covered by contract tests;
- MCP file requests reject unregistered roots, absolute/UNC/drive paths,
  traversal, globs, aliases, symlink/junction escapes, and post-open identity
  changes without returning a local path;
- CI uses only the `strict_offline` CLI path and never starts LanguageTool or a semantic provider.

## M4 — post-Core-MVP semantic judge beta

### Deliverables

- capability-aware TextJudgeProvider contract;
- minimal ambiguous-candidate selector;
- fixed, versioned judge rubric and output schema;
- exact provider-route tuples and a typed `JudgeRunSummary` with per-attempt
  execution provenance and closed reason codes;
- verified loopback local-model reference adapter;
- at least one existing-subscription adapter;
- content-free static capability probes plus a separately stored, explicitly
  invoked synthetic behavioral-isolation diagnostic that can detect regressions
  but never prove or upgrade tool isolation;
- local schema validation and one bounded repair attempt;
- separate `allow_provider_fallback` and `allow_paid_fallback` policy fields, both false by default;
- exact trusted fallback-target allowlists by provider configuration, route,
  model, recipient, data path, and billing source;
- separate primary and provider-verification paid authorization, currency,
  positive per-analysis/per-invocation ceilings, document/request/quota-unit
  budgets, and preflight reservations, all denied by default;
- visible requested/effective provider route, model, client version, route and
  capability maturity, auth/billing class, recipient, local-or-cloud data path,
  per-attempt disclosure, local-client persistence, provider
  retention/training, telemetry, usage, verification references, aggregate
  budget, runtime-context decision, and fallback provenance;
- design fixtures for successful subscription execution, preflight rejection,
  stale/failed verification, and a paid cross-provider fallback with two
  disclosure recipients.

### Proposed adapter order

1. Verified loopback OpenAI-compatible local-model endpoint as the provider-independent reference.
2. Codex official `exec` for stateless personal-local subscription analysis.
3. Claude API/cloud adapter; a consumer-subscription CLI adapter remains blocked pending written Anthropic approval or clarified public terms.
4. Gemini official headless CLI; ACP remains future work.
5. Copilot SDK only after capability-level maturity and billing probes; any feature still marked preview remains experimental even though GitHub announced the core SDK GA on June 2, 2026.
6. Explicit BYOK API providers.

The order can change based on which subscriptions the first users already have. Every adapter is optional.

### Acceptance criteria

- user content is passed through stdin or protocol fields, never shell interpolation;
- each child process receives an adapter-specific environment allowlist rather than the inherited environment, and unrelated provider keys are absent;
- vendor tools, plugins, MCP, hooks, extensions, memory, and project instructions are disabled through a documented, version-matched route; a verified tool-less local route may declare isolation not applicable, while a restricted or unverifiable route is ineligible;
- static probes use no inference or credits; a separately authorized,
  version-pinned behavioral self-test uses only fixed synthetic text as a
  supplemental regression canary, never as proof of tool denial, stores its own
  lifecycle/disclosure/budget/usage result, and disables the adapter on failure
  or staleness when configured as required;
- the provider runs in an empty temporary directory;
- timeouts kill the complete process tree;
- before the first request, the UI/CLI discloses whether text stays on-device or is sent by a local CLI to a provider cloud;
- personal subscriptions default to one concurrent request;
- every personal-subscription adapter refuses CI, shared/multi-tenant execution, and non-loopback serving in Voice Lint 0.x;
- every personal-subscription attempt carries positive same-OS-user,
  owner-only-runtime, non-proxied local context evidence; an unverifiable
  context fails closed;
- no adapter reads a browser session or private OAuth file;
- `allow_provider_fallback` and `allow_paid_fallback` default independently to false, and enabling either never enables the other;
- a fallback matches one exact trusted target/configuration/route tuple before
  disclosure, and every recipient gets its own disclosure and data-handling
  evidence;
- at most one fallback transition is attempted per document; chains, cycles,
  and second-target retries are rejected;
- any initial paid or possibly paid execution remains forbidden until
  separately authorized with an explicit currency and positive per-analysis
  and per-invocation preflight-enforceable cost ceilings;
- any paid or possibly paid primary, repair, fallback, or behavioral probe has
  an auditable immutable preflight bound; batch worst-case reservations fit
  positive invocation-wide money, document, request, and quota-unit limits
  before the first document is sent;
- client history is disabled through a documented ephemeral route; provider
  retention/training and telemetry are verified or explicitly consented under
  trusted runtime policy before disclosure;
- accidental API-key precedence or a billing class different from the requested class causes refusal, not silent continuation;
- provider failure produces reduced coverage unless the relevant fallback was explicitly authorized;
- every attempted or effective fallback records from/to provider, model, recipient, data path, reason, auth/billing transition, paid authorization, and per-transition usage;
- local-connected adapters reject redirects and proxies, use no DNS, verify the
  loopback peer, ignore response URLs, and report sidecar disclosure without
  claiming that Voice Lint verified the sidecar's own egress;
- semantic prompts, responses, and complete input are not logged or persisted by default;
- provider output is limited to a closed rubric label, explanation, and
  target-relative evidence per known candidate; Voice Lint assigns rule,
  category, dimension, severity, origin, disposition, and eligibility locally;
- every M4 semantic finding is advisory and cannot affect policy or a blocking
  exit code; prompt-injection fixtures prove that content cannot fabricate an
  error finding, choose another candidate, or modify policy;
- every semantic finding has an invocation, candidate, and immutable rubric
  reference resolving to provider/model/client/recipient/data-path/probe
  provenance, plus a source span and explanation.

## M5 — score calibration and public beta

### Deliverables

- human-labeled German and English holdouts;
- a versioned calibration protocol and score model with separate language/domain coverage;
- calibrated per-language thresholds;
- activation of numeric dimension and aggregate scores only for language/domain combinations that pass calibration;
- advisory `warn_below` target evaluation only for an activated, version-matched score;
- public rule precision and dismissal metrics;
- three complete example profiles;
- migration rules for schemas and rulesets;
- signed packages or standalone binaries for Windows, macOS, and Linux;
- updated SBOM and third-party notices for the public-beta artifact set;
- privacy, threat-model, evaluation, and troubleshooting documents;
- Agent Orchestrator integration example with one bounded repair pass.

### Acceptance criteria

- each blocking rule has at least 20 positive and 20 negative fixtures;
- every other built-in rule has at least 10 positive and 10 negative fixtures;
- blocking rules reach at least 90 percent precision on the curated holdout;
- other enabled-by-default rules reach at least 85 percent precision;
- results are published separately for German and English;
- before this milestone's calibration gate passes, per-dimension `score_status`, `quality_score_status`, and `slop_risk_status` remain `uncalibrated`, all numeric scores remain null, and numeric targets remain inactive;
- after activation, every numeric score records score-model, calibration-corpus, ruleset, language, domain, and coverage versions;
- unsupported or uncalibrated language/domain combinations continue to return a null score rather than extrapolating;
- the clean-environment quickstart completes in less than ten minutes;
- no score is described as objective literary quality;
- telemetry is absent or explicit opt-in.

## M6 — experimental AI-origin signal

This milestone begins only after the quality system has a useful evaluation baseline.

### Deliverables

- exactly one optional pinned local-child detector backend with no sockets or runtime downloads;
- independent model and limitations card;
- minimum-length, language, and calibration gates;
- `not_run`, `unsupported`, `insufficient_evidence`, `available`, and `failed` states;
- risk bands instead of authorship probability;
- a separate evaluation with target false-positive rates;
- explicit mixed-authorship and paraphrasing limitations;
- explicit `strict_offline`, `on_device`, local-recipient execution provenance
  with verified backend and model artifact digests;
- the same fixed-argv, stdin or protected-temp-input, empty-workdir,
  environment-allowlist, bounded stdout/stderr, wall/idle timeout,
  memory/process-count, process-tree cancellation, and cleanup controls as
  other local child analyzers.

### Acceptance criteria

- short text abstains by default;
- unsupported language or missing calibration never returns a risk band;
- network-denial tests prove the detector neither opens sockets nor downloads code or weights;
- local-child tests prove raw input never enters argv, inherited environment,
  default logs, or persistent state; resource limits and cancellation terminate
  the full process tree and temporary input is removed;
- backend, model, model-card, calibration-package, and evaluation-card hashes
  are verified before use and a mismatch fails closed;
- execution requires both a trusted backend selection and a current-request
  opt-in alongside at least one quality check; AI-only requests are invalid;
- the public contract has no probability_ai field;
- the signal cannot change quality scores;
- no Voice Lint 0.x CI command, action, SARIF policy, or exit code runs or consumes the AI-origin signal;
- an attempted AI-origin invocation in a detected CI environment returns `not_run` with the stable `disabled_in_ci_0x` reason;
- documentation forbids use as proof or as the sole basis for high-stakes action.

## First vertical-slice backlog

These are suitable initial issues:

1. Add workspace, TypeScript, test, and CI scaffolding.
2. Complete the Distribution ADR and populate the existing third-party notice template for the first pinned dependency set.
3. Define and validate Finding and AnalysisResult schemas.
4. Decide and test Unicode source-position semantics on CRLF and emoji.
5. Parse Markdown prose regions and retain a source map.
6. Build a safe generic child-process runner.
7. Run pinned Vale against stdin and normalize JSON findings.
8. Create the first five German and five English style rules with fixtures.
9. Implement text and JSON CLI reporters.
10. Implement policy evaluation and stable exit codes.
11. Add deterministic `strict_offline` no-socket and logging tests.
12. Publish an end-to-end design-alpha demo against the example profile.

## Evaluation workflow

Every rule change follows:

~~~text
proposal
  → annotated positive and negative fixtures
  → implementation
  → precision check on development fixtures
  → review of false positives
  → holdout evaluation
  → ruleset version decision
~~~

Semantic-rubric changes follow the same workflow and additionally pin provider, model, client, rubric, and output-schema versions.

## Definition of done for the Core MVP (M0–M3)

The Core MVP is useful when a new user can:

1. install Voice Lint on a supported desktop platform;
2. create and validate a project profile;
3. check German and English Markdown in `strict_offline` with no analyzer sockets;
4. receive accurate source-located findings from versioned rules;
5. explicitly opt into a user-installed loopback LanguageTool service through `local_connected`;
6. call the same analysis through CLI, canonical JSON, authenticated loopback HTTP, and bounded MCP operations;
7. use baselines, SARIF, and an offline CI example without semantic or AI-origin providers;
8. reproduce or explain every blocking finding while score values remain visibly uncalibrated until M5.
