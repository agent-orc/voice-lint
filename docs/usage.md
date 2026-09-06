# Planned usage

Status: proposed `design-0` contract, not implemented

For the newly prioritized embeddable JavaScript library and local website or
Markdown review workflow, see [Voice Studio and Voice Review](on-page-review.md).
Its proposed `voice-lint dev --site quality-studio` launcher requires trusted
site registration. It is not available yet. The CLI and direct-text API below
remain separate analyzer contracts.

This document defines the intended command-line and protected loopback interfaces. Names and fields may change until M0 schemas and compatibility rules are accepted.

## Configuration trust boundary

Voice Lint has two deliberately different configuration types.

| Configuration | Owner and location | May control |
|---|---|---|
| `VoiceProfile` | Project/repository, normally `.voice-lint/profile.yml` | Language, terminology, named rules, examples, weights, warning thresholds, finding policy, suppressions |
| `RuntimeConfig` | Trusted user, outside an untrusted repository | Operating mode, installed engines, executable paths, endpoints, profile registry, provider/auth/billing selection, process rights, server token settings, cache |

A repository profile cannot choose a provider, endpoint, credential variable, executable, network mode, paid fallback, or process capability. Voice Lint must reject those keys rather than silently honoring them. Runtime configuration is never discovered by walking an untrusted repository.

See [the example voice profile](../examples/voice-profile.yml) and [the example runtime configuration](../examples/runtime-config.yml).
The checked-in runtime file is an inert, self-contained documentation template;
an implementation must never auto-discover or trust it merely because it is in
a repository. Copy reviewed settings to a user-owned location and update its
profile registry for real use.

## Installation

No installable package exists yet. Planned distribution targets are:

- a scoped npm package for the CLI and local server;
- standalone binaries for Windows, macOS, and Linux after a packaging spike;
- a container image for service/BYOK deployments, not for personal subscription credentials;
- source installation for contributors.

The target smoke test is:

~~~bash
voice-lint version
~~~

## Project layout

~~~text
my-project/
├── .voice-lint/
│   ├── profile.yml
│   ├── good-examples/
│   ├── bad-examples/
│   └── baseline.json
├── .voice-lintignore
├── docs/
└── README.md
~~~

The profile and examples may be versioned. Example paths are resolved relative to the profile directory and cannot escape it. Runtime configuration, credentials, provider state, and session tokens do not belong here.

## Create and validate a profile

~~~bash
voice-lint profile init
voice-lint profile validate .voice-lint/profile.yml
~~~

Initialization should:

1. ask for the primary language;
2. create a conservative profile with no provider settings;
3. create empty good- and bad-example directories;
4. avoid overwriting existing files;
5. explain which checks are available in the selected runtime mode.

Validation returns structured paths and actionable messages. Unknown security-sensitive keys are errors.

## Initialize trusted runtime configuration

The project profile is repository-owned, but the profile registry and every
runtime permission live in a user-owned file. The proposed setup commands are
safe to repeat: `--if-missing` never overwrites an existing runtime file, and
`profile register` is idempotent only when the ID already resolves to the same
canonical file. Remapping an ID requires a separate explicit `--replace`.

POSIX:

~~~bash
VOICE_LINT_RUNTIME_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/voice-lint/runtime.yml"
voice-lint runtime init \
  --output "$VOICE_LINT_RUNTIME_CONFIG" \
  --if-missing
voice-lint runtime profile register agent-orc-documentation \
  --runtime-config "$VOICE_LINT_RUNTIME_CONFIG" \
  --profile "$PWD/.voice-lint/profile.yml"
~~~

Windows PowerShell:

~~~powershell
$runtimeConfig = Join-Path $env:LOCALAPPDATA "voice-lint\runtime.yml"
$profilePath = (Resolve-Path ".voice-lint\profile.yml").Path
voice-lint runtime init --output $runtimeConfig --if-missing
voice-lint runtime profile register agent-orc-documentation `
  --runtime-config $runtimeConfig `
  --profile $profilePath
~~~

`runtime init` creates a conservative `strict_offline` configuration with no
provider, fallback, cache, or trusted file root. `profile register` validates
the profile as untrusted editorial data, resolves the canonical file identity,
and writes only to the explicitly named trusted runtime file. Neither command
copies runtime authority into the repository.

## Check text

Check files, directories, globs, or standard input:

~~~bash
voice-lint check README.md
voice-lint check README.md docs/
voice-lint check "content/**/*.md"
printf "A short text" | voice-lint check -
~~~

Without `--profile`, the CLI resolves only
`<current-working-directory>/.voice-lint/profile.yml`. It does not walk to a
parent, discover profiles below each input, or use a built-in default. A
missing file is exit code `2`. One invocation has one profile; monorepos and
inputs spanning projects use an explicit profile or separate invocations.

Select a profile and output format:

~~~bash
voice-lint check docs/ \
  --profile .voice-lint/profile.yml \
  --format json
~~~

Planned core-MVP formats are `text`, `json`, and `sarif`.
For one document, JSON output is one `AnalysisResult`. For multiple files,
directories, or globs, JSON output is one `BatchAnalysisResult` containing
complete per-document results; findings are never flattened across documents.
Files are de-duplicated and sorted by normalized workspace-relative
`document_id` in Unicode code-point order. Direct stdin text receives an opaque
generated ID. Absolute local paths are not serialized.

### Policy and runtime flags

~~~text
--fail-on warning|error|never
--warn-below-quality-score <0..100>
--baseline <path>
--changed-since <git-ref>
--require-capability <id>
--runtime-mode strict_offline|local_connected|personal_cloud|byok_cloud
--runtime-config <trusted-path>
--no-suggestions
~~~

`--fail-on` applies only to concrete findings at or above the selected severity. A low aggregate score can emit a warning but cannot produce a blocking content verdict by itself. Before M5 calibration, quality and SLOP scores are `null`, so score warnings are inactive.
A profile declares closed `required_capabilities` and `required_dimensions`
plus `minimum_coverage`; `--require-capability` can only add a requirement for
that invocation. Neither form enables an engine or changes runtime authority.

Runtime flags that permit sockets, cloud transfer, or billing require explicit user action. A project file cannot set them. The safe default is `strict_offline`.

## Exit codes

| Code | Meaning |
|---:|---|
| `0` | Analysis completed and concrete-finding policy passed |
| `1` | Analysis completed and concrete-finding policy failed |
| `2` | Invalid input, profile, runtime configuration, or request |
| `3` | Internal failure |
| `4` | A required capability, dimension, or coverage threshold was unavailable |

For a batch, code `4` takes precedence over `1` so incomplete evaluation stays
visible; otherwise any failed document produces `1`, and an all-passing or
warning-only batch produces `0`. Invocation/configuration errors use `2`; an
internal error that prevents a valid batch envelope uses `3`.

An AI-origin signal cannot produce exit code `1` anywhere in the `0.x` contract. In a detected CI environment it is not executed and returns `not_run` with `disabled_in_ci_0x`. There is no unsafe override.
It runs only when an eligible backend is selected in trusted runtime
configuration and the current request adds `ai_origin` alongside at least one
quality check. An AI-only request is invalid input (exit `2`) before any signal
or quality analysis runs.
The planned M6 detector is local-only in 0.x: a pinned local child
execution, no sockets, no runtime download, and explicit `on_device`
provenance. Cloud detector APIs are outside this contract.

## Result contract

All public JSON uses `snake_case`. The canonical schemas will define separate enums rather than overloading one `status` field:

- `finding.severity`: `info | warning | error`;
- `dimension.status`: `pass | warning | fail | insufficient_evidence | not_applicable | unavailable`;
- `summary.policy_status`: `pass | fail | not_evaluated`;
- `summary.analysis_status`: `pass | warning | fail | incomplete`;
- `summary.quality_score_status`, `summary.slop_risk_status`, and per-dimension `score_status`: `uncalibrated | available | insufficient_coverage | not_applicable | incompatible`;
- target `status`: `met | below | unavailable`;
- finding `disposition`: `active | suppressed_source | baseline_existing`.

Every result contains:

- opaque or workspace-relative `document_id`, language, input format, and size;
- analysis, policy, score, and coverage state;
- required capabilities and dimensions plus any unmet requirement;
- configured numeric targets with an independent `met | below | unavailable` state;
- every configured dimension, including unavailable or uncalibrated ones;
- typed raw measurements with units, applicability, engine, and method version;
- findings with source span and full engine/ruleset provenance;
- active, source-suppressed, or baseline-existing finding disposition;
- profile, schema, ruleset, analyzer, and optional provider versions;
- explicit comparison availability and its compatibility keys;
- visible skipped engines and fallbacks;
- schema-closed diagnostics with safe code, level, and message;
- a separate AI-origin section, even when not run.

The current fixture is [examples/analysis-result.json](../examples/analysis-result.json). It intentionally returns `null` scores because calibration has not happened.

### Source positions

The proposed convention is a half-open Unicode code-point interval, `[start_char, end_char)`, with one-based display lines and columns. It is not normative until the M0 source-position ADR is accepted. Tests must cover umlauts, combining marks, emoji, CRLF, Markdown syntax, and adapter offset mapping.

Vale receives original source text and preserves its markup-aware positions. Native metrics receive an internal document model. LanguageTool receives extracted prose segments with base offsets and source maps.

## Exclusions, suppressions, and baselines

Three mechanisms serve different purposes:

1. `.voice-lintignore` excludes repository paths by documented gitignore-style patterns.
2. A voice profile may disable or change the severity of a named rule.
3. A source suppression may dismiss one finding with a reason and optional expiry.

Proposed Markdown syntax:

~~~markdown
<!-- voice-lint-disable-next-line de.term.forbidden reason="quoted source" expires="2027-01-01" -->
> Das Original enthält den verbotenen Ausdruck.
~~~

Broad file-level suppression is disabled by default. Unknown rule IDs, malformed directives, expired suppressions, and suppressions without a reason are reported. The exact comment grammar and support for non-Markdown formats require an M0 ADR.
A matched source suppression remains in the result as
`disposition: suppressed_source` with its reason and expiry. It is not policy
eligible. An expired directive leaves the finding `active` and adds a
structured diagnostic.

A baseline records accepted finding fingerprints so existing debt does not block new work. It must include schema, profile, ruleset, source-position convention, rule ID, and a stable contextual fingerprint. Moving or materially editing the affected passage invalidates the entry. Baselines do not hide findings from reports; they mark them `baseline_existing`. Raw excerpts and unsalted content hashes must not be placed in logs.
A baseline match uses `disposition: baseline_existing`, a stable non-content
`baseline_id`, and the review reason; only `active` findings participate in
`fail_on` policy.

## Local HTTP API

### Start the server

POSIX, terminal 1:

~~~bash
VOICE_LINT_RUNTIME_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/voice-lint/runtime.yml"
VOICE_LINT_RUN_DIR="${XDG_RUNTIME_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/voice-lint/run}"
VOICE_LINT_SESSION_TOKEN_FILE="$VOICE_LINT_RUN_DIR/session.token"
voice-lint serve \
  --runtime-config "$VOICE_LINT_RUNTIME_CONFIG" \
  --session-token-file "$VOICE_LINT_SESSION_TOKEN_FILE"
~~~

POSIX, terminal 2:

~~~bash
VOICE_LINT_RUN_DIR="${XDG_RUNTIME_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/voice-lint/run}"
VOICE_LINT_SESSION_TOKEN_FILE="$VOICE_LINT_RUN_DIR/session.token"
printf '%s\n' 'Konkreter Text.' | \
  voice-lint api analyze \
    --server http://127.0.0.1:4765 \
    --session-token-file "$VOICE_LINT_SESSION_TOKEN_FILE" \
    --profile-id agent-orc-documentation \
    --document-format text \
    --input -
~~~

Windows PowerShell, terminal 1:

~~~powershell
$tokenFile = Join-Path $env:LOCALAPPDATA "voice-lint\run\session.token"
$runtimeConfig = Join-Path $env:LOCALAPPDATA "voice-lint\runtime.yml"
voice-lint serve --runtime-config $runtimeConfig --session-token-file $tokenFile
~~~

Windows PowerShell, terminal 2:

~~~powershell
$tokenFile = Join-Path $env:LOCALAPPDATA "voice-lint\run\session.token"
"Konkreter Text." | voice-lint api analyze `
  --server http://127.0.0.1:4765 `
  --session-token-file $tokenFile `
  --profile-id agent-orc-documentation `
  --document-format text `
  --input -
~~~

`voice-lint api analyze` is part of the same planned distribution as the server.
It accepts only an HTTP loopback-literal server URL, disables redirects and
proxies, reads the bearer token from the protected file, reads content from a
file or stdin, and prints the canonical JSON response. It never accepts a token
value or document text as a command-line argument. Thus the quickstart has no
undeclared Python, curl, Node, or shell-extension dependency beyond the
installed Voice Lint package and the platform shell already being used.

At startup the server generates a cryptographically random session token. For
an explicit token path it atomically creates the parent runtime directory and
file with owner-only POSIX permissions or a current-user-only Windows DACL.
It rejects unsafe existing files, symlinks, junctions/reparse targets, wrong
ownership, or unverifiable permissions and removes the token file on shutdown.
Inherited process IPC is the alternative for a parent application. The token
is never printed into a normal log, accepted in a URL, or reused after the
process stops.

The local server:

- binds to `127.0.0.1` by default and never trusts `X-Forwarded-*` headers;
- requires `Authorization: Bearer <session-token>` on every non-health request;
- validates `Host` against configured loopback hosts;
- rejects foreign origins and the literal `Origin: null`;
- permits an absent `Origin` only for authenticated non-browser clients;
- emits no permissive CORS headers;
- enforces configured request-body, timeout, rate, and concurrency limits;
- rejects arbitrary file paths, executable names, endpoints, and credential fields;
- uses profile IDs registered in trusted runtime configuration.

Loopback plus a token is a convenience boundary, not a hardened multi-user service. `personal_cloud` is forbidden in shared, proxied, containerized, CI, or remotely bound modes.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/analyze` | Analyze direct text |
| `POST` | `/v1/profiles/validate` | Validate a path-free inline `VoiceProfileDraft`; corpus paths are rejected |
| `GET` | `/v1/rules` | List installed rule metadata |
| `GET` | `/healthz` | Minimal liveness status; no user/provider details |
| `GET` | `/version` | Contract, core, and ruleset versions |

File and directory traversal stays a CLI feature in the core MVP. A future file API would need pre-registered roots and its own path-security ADR.

### Analyze request

~~~json
{
  "schema_version": "design-0",
  "text": "In der heutigen schnelllebigen Welt ist es wichtig zu beachten ...",
  "language": "auto",
  "document_format": "markdown",
  "profile_id": "agent-orc-documentation",
  "checks": ["quality", "slop", "voice"],
  "include_suggestions": true,
  "include_excerpts": true,
  "include_evidence_text": false
}
~~~

`document_format` describes the input (`markdown` or `text` in the initial
contract); it is distinct from the CLI reporter flag `--format`.
The server generates the opaque `document_id` for direct HTTP text; a request
cannot submit a local path as an identifier.
`include_suggestions`, `include_excerpts`, and `include_evidence_text` all
default to `false` for HTTP. The response echoes them in
`response_projection`; excerpt text is present in the full fixture because its
example projection explicitly opts in.

`profile_id` resolves only through the trusted runtime registry. Requests cannot select engines or semantic providers. Model keys and subscription credentials are never request fields.

### Analyze response

This is an abridged display fragment, not a standalone schema fixture. The full canonical design example is [examples/analysis-result.json](../examples/analysis-result.json).

~~~json
{
  "schema_version": "design-0",
  "contract_status": "proposed",
  "summary": {
    "analysis_status": "warning",
    "policy_status": "pass",
    "quality_score_status": "uncalibrated",
    "quality_score": null,
    "slop_risk_status": "uncalibrated",
    "slop_risk": null,
    "coverage": 1.0
  },
  "findings": [
    {
      "schema_version": "design-0",
      "finding_id": "design-example-finding-1",
      "rule_id": "de.generic_opening.fast_world",
      "category": "formulaic_opening",
      "dimension": "clarity",
      "severity": "warning",
      "message": "The opening is generic and carries no project-specific information.",
      "location": {
        "position_encoding": "unicode_code_point",
        "start_char": 0,
        "end_char": 35,
        "start_line": 1,
        "start_column": 1,
        "end_line": 1,
        "end_column": 36
      },
      "engine_id": "vale",
      "engine_version": "design-pinned-version",
      "ruleset_version": "de-default-1-design",
      "rule_origin": "builtin",
      "policy_eligibility": "eligible",
      "disposition": "active",
      "disposition_detail": null
    }
  ],
  "ai_origin_signal": {
    "status": "not_run",
    "risk_band": null,
    "experimental": true
  }
}
~~~

The full fixture includes every configured dimension, complete AI-origin abstention metadata, and execution provenance.

### Error contract

Errors use a stable envelope and never include input text, secrets, absolute credential paths, or raw provider output:

~~~json
{
  "schema_version": "design-0",
  "error": {
    "code": "unknown_profile_id",
    "message": "The requested profile is not registered.",
    "request_id": "01J...",
    "details": []
  }
}
~~~

| HTTP status | Use |
|---:|---|
| `400` | Malformed JSON or mutually incompatible fields |
| `401` | Missing or invalid session token |
| `403` | Rejected host/origin or forbidden capability |
| `404` | Unknown registered resource such as `profile_id` |
| `413` | Request body or text limit exceeded |
| `415` | Unsupported HTTP `Content-Type` |
| `422` | Structurally valid but invalid request semantics, including an unsupported `document_format` |
| `429` | Rate or concurrency limit exceeded |
| `500` | Sanitized internal error |
| `503` | Core service unavailable before an `AnalysisResult` can be constructed |
| `504` | Request deadline expired before an `AnalysisResult` could be constructed |

Engine availability is domain state, not transport state. A selected optional-engine failure returns `200` with `analysis_status: warning`, reduced coverage, a failed check-execution state, and a structured warning diagnostic. A required-capability failure also returns `200`, but with `analysis_status: incomplete` and `policy_status: not_evaluated`. Codes `503` and `504` apply only when no valid result envelope can be produced.

## Runtime modes

### `strict_offline`

- through the CLI, opens no TCP, UDP, Unix-domain, named-pipe network bridge, or loopback socket;
- through the HTTP API, permits only the already-running authenticated loopback listener; the analysis engine and launched analyzers open no additional sockets;
- runs only Vale as a child process and native deterministic metrics;
- skips LanguageTool, Ollama, vendor CLIs, and every cloud provider visibly;
- is the default for CLI and CI;
- aims for byte-stable canonical domain results with pinned versions.

### `local_connected`

- permits explicitly configured loopback services only;
- Voice Lint connects only to literal `127.0.0.1`, `[::1]`, or an approved
  local IPC endpoint; it does not resolve hostnames, use proxies, follow
  redirects, accept response-supplied URLs, or accept a non-loopback peer;
- may enable LanguageTool or a user-run local model;
- constrains Voice Lint's connection but does not prove that a separately
  managed sidecar has no cloud proxy, updater, telemetry, or other egress; the
  sidecar is a user-trusted component and provenance says
  `loopback_local_service`, not inferred `on_device`;
- does not promise byte-deterministic output from a generative model.

### `personal_cloud`

- runs one explicitly selected, officially installed vendor CLI or SDK locally;
- sends the minimum selected text and rubric to that provider's cloud;
- uses the user's documented local authentication boundary;
- is single-user desktop-only, with one request at a time by default;
- forbids automatic provider switching and paid fallback by default.

### `byok_cloud`

This mode uses an explicit API credential or organization identity. It is separate from consumer subscriptions and requires explicit privacy, retention, billing, and concurrency configuration.

A future shared `service` deployment is a separate product and threat-model boundary rather than a personal runtime mode. It additionally requires tenant isolation, user authentication and authorization, audit, abuse controls, and a documented data lifecycle.

## Semantic provider configuration

Semantic analysis is post-MVP and disabled by default. A trusted runtime configuration selects one provider; there is no `auto` selection:

~~~yaml
mode: personal_cloud

semantic:
  enabled: true
  provider: codex_exec
  provider_config_id: personal-codex
  provider_route: codex_exec.personal_cli
  max_parallel: 1
  max_documents_per_invocation: 10
  max_requests_per_invocation: 12
  max_requests_per_process_session: 50
  # Empty quota arrays are accepted only if version-matched route evidence
  # proves that provider requests are the sole consumed allowance unit.
  quota_limits: []
  quota_process_session_limits: []
  fallback_targets: []
  allow_provider_fallback: false
  allow_paid_fallback: false
  data_handling:
    allow_local_client_history: false
    allowed_provider_retention_modes:
      - no_provider_storage
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
~~~

The empty quota arrays in this conservative example do not declare that a
Codex subscription is quota-free. They pass preflight only if the pinned client
route exposes verified evidence that no separate credit, premium, or
provider-defined unit is consumed. Otherwise the user must configure matching
positive invocation and process-session limits for every applicable unit. An
unknown unit, variable conversion, or unverifiable weight makes semantic
execution unavailable; Voice Lint then returns deterministic analysis with
reduced coverage. Provider request counts remain governed by the two scalar
request limits and never appear again as quota lines.

If that route fails, default behavior is rules-only output with visible reduced
coverage. Any Voice-Lint-initiated switch of provider configuration or route
requires provider-fallback consent, even for the same vendor; a possibly paid
target additionally requires paid-fallback consent. Fallback flags never
authorize the initial call. The adapter must establish a conservative preflight
upper bound from provider-enforced limits or pinned price and token caps. If it
cannot prove that bound before sending text, it refuses the paid call.

Fallback also requires an exact trusted `fallback_targets` entry naming the
provider configuration, provider, route, model, recipient, data path, and
allowed billing source; an enabled flag with an empty list authorizes nothing.
Any primary paid or possibly paid call, including possible subscription
overage, requires `allow_paid_primary: true` plus positive per-analysis and
per-invocation ceilings in one currency. Before the first document in a batch
is sent, Voice Lint reserves the worst-case cost of every planned primary,
repair, and single possible fallback per document and checks document, request, and quota-unit
limits. Zero means deny, not unlimited. The result reports the configured
budget, reservation, and actual requests, AI credits/premium requests or other
quota units, and cost.
Money uses exact `{ currency, scale, units }` values, where `units` is a quoted
non-negative integer and the value is `units × 10^-scale`; no JSON/YAML float is
accepted. Derived reservations use integer arithmetic and always round upward.
When a connected provider is exposed through `voice-lint serve` or the
owner-bound stdio MCP process, positive process-session request/quota limits are
also mandatory; a paid or possibly paid route additionally needs a positive
session money ceiling. The process reserves worst-case units atomically,
returns a non-secret budget snapshot, and latches provider execution off at
exhaustion until the user starts a new process. A zero session limit denies
provider work and never means unlimited.

Recipient, route/data path, and the personal-route tool-isolation and
local-single-user floors are compiled checks, not disableable `require_*`
options. The data-handling settings are explicit consent: by default an
eligible client must be ephemeral/no-history, provider retention cannot be
unknown or exceed the allowed modes/day ceiling, provider training use is
denied, and provider-managed telemetry is denied. The result records verified
or unavailable local persistence, provider retention/training policy,
telemetry, and immutable evidence references for every actual disclosure
recipient.

Automatic static capability probes never send user text, invoke a model, or
consume credits. A separate `voice-lint provider verify` behavioral self-test
may use a fixed public synthetic string to detect observable isolation
regressions for an exact client version and configuration; a pass cannot prove
that tools are absent or upgrade the isolation level. It requires explicit
invocation and, for a cloud provider, a disclosure manifest, quota limits and,
when possibly paid, `allow_paid_provider_verify: true` plus a positive
provider-verify cost ceiling and preflight bound. Probe provenance records
observation/expiry times, disclosure, bound, actual usage, and cost. If the
documented tool-denial route or any compiled recipient, data-path, or runtime
context check remains unavailable, the adapter fails closed.

### Existing subscriptions

Support is deliberately asymmetric:

- **Codex:** official local exec first; a trusted SDK client may follow. The entire App Server surface is currently experimental and not a production path. Official documentation does not establish a public multi-tenant consumer-subscription proxy.
- **GitHub Copilot:** official SDK; local login initially, documented per-user OAuth only in a future product. GitHub [announced the core SDK generally available on 2026-06-02](https://github.blog/changelog/2026-06-02-copilot-sdk-is-now-generally-available/), while individual capabilities may still be preview; plan usage may consume credits or allow billed overage.
- **Gemini:** official headless CLI in the first M4 adapter; ACP is a documented future option. Voice Lint never harvests the CLI's OAuth cache.
- **Claude:** programmatic CLI mechanics are documented, but a consumer-subscription adapter is blocked pending written Anthropic approval or clearer public terms for third-party local wrappers. An implemented Claude adapter therefore requires explicit API/cloud credentials.

A local vendor CLI still performs cloud inference. The selected excerpt leaves the machine, provider terms apply, and results may not be reproducible.

Personal credentials and login caches must never be copied into a container image, public CI secret, shared runner, remote server, or another user's session. CI uses `strict_offline`, BYOK/service credentials, or an explicitly supported enterprise identity.

### Child-process boundary

Vendor processes use an argument array with shell execution disabled. User text is passed only through stdin or a protocol field. Each run gets a fresh temporary working directory, hard input/output/time limits, process-tree cancellation, and locally validated structured output.

The adapter passes a minimal environment allowlist. Subscription mode removes API-key and cloud-credential variables including `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `OPENAI_API_KEY`, `CODEX_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, and analogous cloud credentials. It never reads private credential caches to infer billing. Tools, plugins, MCP servers, memories, and project instructions are disabled where the provider supports it; unverifiable isolation fails closed.

The `judge` envelope records requested/effective configuration, exact route and
capability maturity, aggregate budgets, ordered attempts, and fallback
transitions. Each attempt's `execution_provenance` records its actual provider,
model, client version, recipient disclosures and data policies, data path, auth,
funding/metering, isolation, immutable probe references, runtime context, and
usage. Values may be unavailable where the official client does not expose
them, but compiled recipient/data-path, personal isolation/context, and
data-handling gates fail closed before disclosure rather than being disabled by
a request flag.

## CI example

The target GitHub Actions integration is intentionally offline:

~~~yaml
name: Voice Lint

on:
  pull_request:

jobs:
  prose:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: agent-orc/voice-lint-action@v1
        with:
          paths: "README.md docs/"
          profile: ".voice-lint/profile.yml"
          format: "sarif"
          fail-on: "error"
~~~

This action does not exist yet. It will default to `strict_offline` and will not accept personal subscription credential caches.

## MCP tools

The initial MCP implementation is one local stdio server. It does not expose a
Streamable HTTP/SSE listener. The MCP client launches one process directly:

~~~bash
VOICE_LINT_RUNTIME_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/voice-lint/runtime.yml"
voice-lint mcp serve \
  --stdio \
  --runtime-config "$VOICE_LINT_RUNTIME_CONFIG"
~~~

The server writes protocol messages only to stdout and bounded, content-free
diagnostics only to stderr. It advertises an `inputSchema` and `outputSchema`
for every tool. Results place the canonical object in `structuredContent` and
also serialize the same object into one text content block for older clients.

### Register a file root

`analyze_files` is disabled until the user explicitly registers a canonical
root in trusted runtime configuration. From the project directory:

~~~bash
VOICE_LINT_RUNTIME_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/voice-lint/runtime.yml"
voice-lint runtime mcp-root register agent-orc-project \
  --runtime-config "$VOICE_LINT_RUNTIME_CONFIG" \
  --root "$PWD" \
  --default-profile-id agent-orc-documentation \
  --allow-profile-id agent-orc-documentation
~~~

The planned command writes an entry equivalent to this into the explicitly
named trusted file; this example is explanatory and is not a repository file
that Voice Lint will discover automatically:

~~~yaml
mcp:
  transport: stdio
  roots:
    agent-orc-project:
      path: /canonical/absolute/path/to/project
      default_profile_id: agent-orc-documentation
      allowed_profile_ids:
        - agent-orc-documentation
~~~

Registration rejects a missing directory, symlink or junction root, duplicate
file identity under another ID, or an unregistered profile. Replacing an
existing mapping requires `--replace`. A request names only `root_id` and
relative paths; it cannot create or widen a root.

### Client launch configuration

MCP clients use different configuration filenames, but local stdio launchers
commonly map the server name to an absolute command and argument vector. The
adapter for a specific client should map this object without changing its
authority:

~~~json
{
  "mcpServers": {
    "voice-lint": {
      "command": "/absolute/path/to/voice-lint",
      "args": [
        "mcp",
        "serve",
        "--stdio",
        "--runtime-config",
        "/absolute/user-owned/path/voice-lint/runtime.yml"
      ]
    }
  }
}
~~~

Do not put provider keys or consumer-subscription credentials into the `env`
object of an MCP launcher. The runtime configuration may refer to an approved
authentication mechanism, but secrets stay in that mechanism's protected
store.

### Tool contracts

Every input is a closed JSON object with `schema_version: "design-0"` and
`additionalProperties: false`. Optional check lists may only narrow the checks
enabled by the runtime and profile.

| Tool | Required input | Optional input | Structured result |
|---|---|---|---|
| `analyze_text` | `text`, `document_format`, `profile_id` | `language`, `checks`, `include_suggestions`, `include_excerpts`, `include_evidence_text` | `{ schema_version, operation: "analyze_text", result: AnalysisResult }` |
| `analyze_files` | `root_id`, non-empty `paths` | `profile_id`, `checks`, `include_suggestions`, `include_excerpts`, `include_evidence_text` | `{ schema_version, operation: "analyze_files", result: BatchAnalysisResult }` |
| `validate_voice_profile` | path-free inline `draft` | none | `{ schema_version, operation: "validate_voice_profile", result: ProfileValidationResult }` |
| `explain_finding` | `rule_id`, `language` | `profile_id` | `{ schema_version, operation: "explain_finding", result: FindingExplanation }` |
| `compare_revision` | complete `before` and `after` `AnalysisResult` objects | none | `{ schema_version, operation: "compare_revision", result: RevisionComparisonResult }` |
| `list_rules` | `profile_id` | `language`, `cursor`, `limit` (maximum 200) | `{ schema_version, operation: "list_rules", result: RulePage }` |

The generated schemas implement these closed `design-0` shapes. `AnalysisResult`,
`BatchAnalysisResult`, `FindingSeverity`, and `FindingDisposition` are the
canonical shared definitions in [Architecture](architecture.md). The inline
`draft` field references the path-free `$defs/voice_profile_draft` generated
from the same VoiceProfile schema; it is not an open JSON object.

~~~typescript
type McpLanguage = "auto" | "de" | "en";
type RuleLanguage = "de" | "en";
type McpDocumentFormat = "markdown" | "text";
type McpCheck = "quality" | "slop" | "voice" | "grammar" | "ai_origin";

interface AnalyzeTextInput {
  schema_version: "design-0";
  text: string;
  document_format: McpDocumentFormat;
  profile_id: string;
  language?: McpLanguage;
  checks?: McpCheck[];
  include_suggestions?: boolean;
  include_excerpts?: boolean;
  include_evidence_text?: boolean;
}

interface AnalyzeFilesInput {
  schema_version: "design-0";
  root_id: string;
  paths: string[];
  profile_id?: string;
  checks?: McpCheck[];
  include_suggestions?: boolean;
  include_excerpts?: boolean;
  include_evidence_text?: boolean;
}

interface ValidateVoiceProfileInput {
  schema_version: "design-0";
  draft: VoiceProfileDraft;
}

interface ExplainFindingInput {
  schema_version: "design-0";
  rule_id: string;
  language: RuleLanguage;
  profile_id?: string;
}

interface CompareRevisionInput {
  schema_version: "design-0";
  before: AnalysisResult;
  after: AnalysisResult;
}

interface ListRulesInput {
  schema_version: "design-0";
  profile_id: string;
  language?: RuleLanguage;
  cursor?: string;
  limit?: number;
}

interface ProfileValidationDiagnostic {
  code: string;
  level: "info" | "warning" | "error";
  message: string;
  json_pointer: string;
  prohibited_key: string | null;
}

interface ProfileValidationResult {
  valid: boolean;
  profile_id: string | null;
  profile_schema_version: number | null;
  diagnostics: ProfileValidationDiagnostic[];
}

interface FindingExplanationExample {
  problematic: string;
  improved: string;
}

interface FindingExplanation {
  rule_id: string;
  language: RuleLanguage;
  title: string;
  category: string;
  default_severity: FindingSeverity;
  policy_eligibility: "eligible" | "advisory";
  rationale: string;
  remediation: string;
  ruleset_version: string;
  examples: FindingExplanationExample[];
}

type RevisionComparisonReasonCode =
  | "score_uncalibrated"
  | "comparison_keys_incomplete"
  | "compatibility_key_mismatch"
  | "calibration_incompatible"
  | "coverage_incomparable";

interface RevisionFindingReference {
  analysis_id: string;
  finding_id: string;
  rule_id: string;
  severity: FindingSeverity;
  disposition: FindingDisposition;
}

interface RevisionFindingMatch {
  before_finding_id: string;
  after_finding_id: string;
  rule_id: string;
}

interface RevisionComparisonResult {
  status: "ready" | "not_available" | "incompatible";
  reason_codes: RevisionComparisonReasonCode[];
  before_analysis_id: string;
  after_analysis_id: string;
  mismatched_keys: string[];
  added: RevisionFindingReference[];
  resolved: RevisionFindingReference[];
  unchanged: RevisionFindingMatch[];
}

interface RuleMetadata {
  rule_id: string;
  language: RuleLanguage;
  title: string;
  description: string;
  category: string;
  default_severity: FindingSeverity;
  policy_eligibility: "eligible" | "advisory";
  engine_id: string;
  ruleset_version: string;
}

interface RulePage {
  rules: RuleMetadata[];
  next_cursor: string | null;
}
~~~

Profile, root, rule, analysis, and finding IDs use the schema-defined bounded
identifier patterns rather than arbitrary paths. `valid` is true exactly when
no error-level profile diagnostic exists. Every profile diagnostic carries an
RFC 6901 JSON pointer; an invalid root object uses the empty pointer. A ready
revision comparison has no reason codes or mismatched keys. `not_available` or
`incompatible` returns empty finding-delta arrays and at least one reason code;
only `incompatible` may have non-empty `mismatched_keys`. Rule cursors are
opaque, process-local, content-free values; `limit` is an integer from 1 to 200
and defaults to 100.

`analyze_text` has the same field meanings and defaults as `POST /v1/analyze`.
It returns one canonical `AnalysisResult`. `analyze_files.paths` accepts literal
relative file or directory paths only, not globs, absolute paths, drive paths,
UNC paths, empty segments, `.` or `..` segments. The server expands directories
deterministically, verifies every canonical file identity after opening it,
and rejects symlink, junction, hard-link alias, mount, or race-based escape.
When `profile_id` is omitted, the registered root's default is used; a supplied
ID must belong to that root's `allowed_profile_ids`. The result is the same
deterministically ordered `BatchAnalysisResult` as the multi-file CLI.

`validate_voice_profile` accepts an inline draft without corpus paths, hooks,
environment interpolation, or runtime keys. It never reads a caller-supplied
path. `explain_finding` resolves installed, versioned rule metadata; it does not
look up prior analyses, echo document text, or call a model. `compare_revision`
is stateless and compares only the two supplied results after verifying their
compatibility keys. It returns `ready`, `not_available`, or `incompatible`,
closed reason codes, before/after analysis IDs, and added, resolved, and
unchanged finding IDs. `list_rules` uses an opaque cursor and a bounded page.

A concrete `analyze_text` structured result is the object under `result` in
[the canonical fixture](../examples/analysis-result.json). A small complete
tool result looks like this:

~~~json
{
  "resultType": "complete",
  "content": [
    {
      "type": "text",
      "text": "{\"schema_version\":\"design-0\",\"operation\":\"validate_voice_profile\",\"result\":{\"valid\":true,\"profile_id\":\"agent-orc-documentation\",\"profile_schema_version\":1,\"diagnostics\":[]}}"
    }
  ],
  "structuredContent": {
    "schema_version": "design-0",
    "operation": "validate_voice_profile",
    "result": {
      "valid": true,
      "profile_id": "agent-orc-documentation",
      "profile_schema_version": 1,
      "diagnostics": []
    }
  },
  "isError": false
}
~~~

Invalid parameters, unknown IDs, containment failures, or the inability to
produce a valid result return `isError: true` plus the same dual representation
of this safe error object. The surrounding MCP tool result also uses
`resultType: "complete"`; malformed JSON-RPC or an unknown tool uses the
protocol's JSON-RPC error mechanism instead of this domain envelope:

~~~json
{
  "schema_version": "design-0",
  "operation": "analyze_files",
  "error": {
    "code": "mcp_root_not_registered",
    "message": "The requested file root is not registered.",
    "retryable": false,
    "unmet_requirements": []
  }
}
~~~

A domain outcome of `warning`, `fail`, or `incomplete` is not an MCP transport
error. It remains a successful tool call carrying the canonical result, so an
agent cannot confuse unavailable coverage with bad writing or infrastructure
failure.

MCP uses the same capability and profile registries as the server and cannot
provide unrestricted model completion, arbitrary file reads, runtime provider
selection, or credential access.

In 0.x, a personal-subscription adapter is eligible through MCP only when Voice
Lint is a stdio child launched directly by the current user's local Agent
Orchestrator/editor process. The inherited handles, process owner, protected
runtime directory/lease, absence of CI/container/proxy/broker transport, and
provider child owner must all verify the same `local_single_user` boundary.
Streamable HTTP/SSE, a shared MCP broker, remote clients, and a reused daemon
cannot use personal credentials. The stdio process enforces the same atomic
process-session request/quota/money budget and returns
`process_session_budget`; at exhaustion it keeps deterministic MCP analysis
available and refuses provider work until explicitly restarted.

## Agent Orchestrator flow

The immediate integration is a bounded CLI child in the task worktree. As of
the 2026-08-09 design snapshot, Agent Orchestrator can observe MCP servers wired
into an underlying agent CLI, but its repository does not define a stable
project-level MCP registry of its own. Therefore an installation either invokes
the Voice Lint CLI as a task/pipeline command or places the stdio launch entry
above in the selected MCP-capable agent client. A future first-class adapter
must preserve the same command, runtime path, registered root, result, and exit
contracts rather than inventing a privileged route.

The direct task command is:

~~~bash
voice-lint check README.md docs/ \
  --profile .voice-lint/profile.yml \
  --format json \
  --fail-on error
~~~

~~~text
Generate draft
     │
     ▼
Voice Lint analysis
     │
     ├── pass ───────────────► human review or publish
     ├── warning ────────────► human review
     ├── fail ─► bounded repair turn ─► analyze once more
     ├── incomplete ─────────► stop automation; surface unmet requirements
     └── tool/config/internal error ─► stop; report infrastructure error
~~~

Exit code `4` or `analysis_status: incomplete` is an infrastructure or coverage
gate, never a repair instruction. The orchestrator caps repair attempts at one,
preserves both results and the text diff, routes a second failure to human
review, and never optimizes blindly for a scalar score. Semantic M4 findings
are advisory in 0.x and therefore cannot create the blocking repair branch.
CLI exit codes `2` and `3`, an MCP `isError: true`, malformed output, or a
missing result envelope stop automation and surface an infrastructure error.
They never publish content and never trigger a text-repair turn.

## Privacy, logs, and cache

Input persistence and result caching are off by default. Default logs contain only duration, input length bucket, language, enabled engine IDs/versions, analysis status, coverage, and sanitized error category.

Default logs do not contain complete text, excerpts, suggestions, prompts, raw model output, public content hashes, secrets, credential paths, or private client state. Diagnostic persistence requires explicit opt-in, a visible retention period, protected storage, and a deletion command.

See [Privacy and threat model](privacy.md) for data flows and mode-specific disclosure.
