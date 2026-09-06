# Privacy and threat model

Status: proposed design contract, not implemented

Voice Lint analyzes user-authored text, which may be unpublished, confidential, personal, or contractually restricted. This document defines the minimum privacy and security boundary for implementation. It is not a certification or a promise about software that does not yet exist.

## Protected assets

- input documents and excerpts;
- voice examples, baselines, and suppressions;
- project names and filesystem paths;
- provider prompts and responses;
- API keys, service identities, and vendor-client sessions;
- subscription quota and billing metadata;
- runtime configuration and local session tokens.

## Trust zones

| Zone | Trusted for capabilities? | Examples |
|---|---:|---|
| Repository content | No | Text, Markdown, `.voice-lint/profile.yml`, ignore rules, examples |
| User runtime configuration | Yes, after explicit selection | Mode, executables, endpoints, profile registry, provider and billing choice |
| Voice Lint core | Yes | Contract validation, orchestration, policy, reporting |
| Local sidecar | Only for declared capability | LanguageTool, user-run local model |
| Vendor client/provider | External data recipient | Codex, Copilot, Gemini, Claude, API provider |
| HTTP or MCP caller | Authenticated but untrusted input | Editor, script, local agent orchestrator |

A repository voice profile is data, not authority. It cannot cause network access, start arbitrary executables, select a credential, choose a provider, change the billing path, broaden file roots, or enable a detector.

## Mode-specific data flow

| Mode | Text destination | Socket policy | Persistence default |
|---|---|---|---|
| `strict_offline` | Voice Lint, Vale child process, in-memory native metrics | CLI: no sockets; API use: authenticated loopback listener only, with no analyzer/provider sockets | Off |
| `local_connected` | Above plus explicitly configured loopback service | Voice Lint transport is hardened loopback/IPC only; the separately managed sidecar's own egress is not verified | Off in Voice Lint; sidecar behavior is user-trusted |
| `personal_cloud` | Above plus one explicitly selected cloud provider through its official local client | Provider connection permitted | Off in Voice Lint; provider terms apply |
| `byok_cloud` | Explicit API endpoint | Configured external endpoint | Off in Voice Lint; provider terms apply |

“Local CLI” does not mean local inference. In `personal_cloud`, the selected text and rubric leave the machine. Voice Lint must show the chosen recipient before the first send and record the actual execution provenance in the result.

A future shared `service` is not a fifth runtime mode. It is a separate deployment and threat-model boundary whose tenant isolation, identity, authorization, network, retention, audit, and abuse policies must be documented by the deployer.

## Data minimization

- Deterministic engines receive only the representation they need.
- Vale receives the original document and format so it can preserve markup scopes and positions.
- Native metrics receive the internal document model.
- LanguageTool receives extracted prose segments with source-map offsets, not unrelated code or front matter.
- A semantic judge receives only ambiguous spans, the minimum useful context, a fixed rubric, and a result schema.
- Profile example corpora stay within the profile directory; cloud transfer requires the same recipient disclosure and consent as document text.
- Automatic static capability probes never contain user text, invoke inference, or consume model credits.
- An explicit behavioral isolation self-test uses only a fixed public synthetic
  string. It is a regression canary, not proof of tool absence; a cloud test
  owns a separate disclosure, lifecycle record, quota budget, and paid
  preflight authorization rather than charging a later document analysis.
- Full-document rewriting is outside the core.

## Logs, cache, and diagnostics

### Explicit editorial review artifacts

The proposed [local Studio/JS-library workflow](on-page-review.md#4-durable-metadata)
adds a separate opt-in review store in the registered content repository.
Saving feedback or a proposal intentionally persists its selected quote,
context, comment, version preconditions and replacement text. Users see the
destination and save result. This is neither default analysis persistence nor
a diagnostic cache. Plain source digests in these opted-in sidecars are not
anonymization. Sidecars, request artifacts and source maps must be excluded
from public website output. The Studio bearer stays in its trusted host;
framed site content receives only a scoped selection/highlight bridge.

### Unchanged analyzer defaults

Default logging may include duration, an input-length bucket, language, engine IDs and versions, coverage, execution state, and a sanitized error category. It must not include:

- input text, excerpts, or suggestions;
- prompts or raw model responses;
- public or unsalted content hashes;
- absolute credential paths;
- tokens, cookies, OAuth caches, or secret-bearing environment variables;
- provider output that reproduces input.

Caching and diagnostic persistence are off by default. An opt-in cache must declare its exact fields, storage directory, encryption/OS-protection assumptions, retention period, and deletion command. Text-bearing findings, prompts, and responses require a second explicit diagnostic opt-in. A cache identifier intended to conceal content uses a keyed HMAC with a locally generated secret; a plain hash is not treated as anonymization, especially for short text.

Planned lifecycle commands:

~~~bash
voice-lint cache status
voice-lint cache purge
voice-lint diagnostics purge
voice-lint provider verification status
voice-lint provider verification purge --expired
voice-lint provider verification purge --all
~~~

These commands are proposed, not implemented.
Provider verification results contain no user document text but do contain
provider/route, safety-configuration digest, evidence snapshots, and quota/cost
metadata. They are owner-only and never synced by default. Authorization expiry
immediately prevents reuse; evidence remains for a separate, lowerable 30-day
historical audit window and is deleted at `retention_until`, or earlier through
the commands above. A missing or purged result makes its historical analysis
reference unavailable and never authorizes reuse.

## Loopback HTTP threats

Loopback does not prevent abuse by another process, a malicious webpage, DNS rebinding, or another local user. The server therefore requires all of the following:

- a cryptographically random per-process bearer token;
- token transport only in the `Authorization` header;
- exact `Host` validation and no trust in forwarding headers;
- rejection of foreign origins and `Origin: null`;
- no permissive CORS response;
- body, text-size, timeout, rate, and concurrency limits;
- pre-registered profile IDs rather than request-supplied paths;
- no request fields for endpoints, executables, credentials, providers, or billing;
- sanitized errors and access logs;
- minimal health output.

The server rejects remote binding in personal modes. A future service mode needs independent authentication, authorization, tenant isolation, audit, abuse, quota, and data-retention design; the local session token is not sufficient.

## Filesystem and profile threats

CLI path handling must canonicalize paths, honor explicit roots where configured, and test traversal through `..`, symlinks, Windows junctions, UNC paths, device paths, case folding, and time-of-check/time-of-use changes. HTTP does not accept file paths in the core MVP.

Profile loaders use closed schemas, bounded inheritance depth, cycle detection, bounded file sizes, and explicit root policies. YAML parsers must use a safe schema without object construction. Example directories are content sources only and cannot contain executable hooks.

## Child-process threats

External tools run without a shell and receive argument arrays. Text travels over stdin or a structured protocol, never command interpolation. Each provider run uses a fresh temporary directory, hard time/input/output limits, process-tree cancellation, and locally validated output.

Provider processes receive a minimal environment allowlist. Subscription mode removes API-key and cloud credential variables that could silently change billing. A personal route must be verified tool-less or disable tools, plugins, MCP servers, memories, user rules, and project instructions through version-matched official controls. Restricted or unverifiable routes fail closed; a synthetic canary or generic process sandbox does not upgrade the isolation claim.

Temporary directories and token files require verified owner-only permissions
or Windows current-user DACLs and are deleted on normal exit. Unverifiable
ownership/permissions fail closed; crash cleanup and Windows ACL behavior
require platform tests.

## Provider and billing threats

- Provider choice is explicit; `auto` is not supported.
- `allow_provider_fallback` and `allow_paid_fallback` are independent and `false` by default.
- Any primary paid or possibly paid call, including possible subscription
  overage, needs separate authorization, an explicit currency, positive
  per-analysis and per-invocation ceilings, and an immutable verified preflight
  bound; fallback flags do not authorize it.
- Batch and long-running server plans also reserve worst-case document,
  request, money, and provider quota/credit units before disclosure. Zero means
  deny, and an unbounded variable credit weight fails closed.
- The default failure path is rules-only analysis with visible reduced coverage.
- A provider switch requires consent because it changes the data recipient.
- An API fallback requires consent because it may change both recipient and cost.
- Each fallback target is an exact trusted provider-configuration/route/model/
  recipient/data-path/billing tuple. Every attempted recipient has a separate
  disclosure and data-handling manifest.
- Auth, funding, metering, overage, route and capability maturity, model,
  effective recipient, data path, local-client persistence, provider
  retention/training, telemetry, disclosure scope, runtime context, and
  isolation evidence are reported with explicit verification state.
- Voice Lint never reads browser storage or private OAuth caches to improve that metadata.
- Personal subscription credentials are forbidden in CI, images, shared containers, shared runners, proxies, remote servers, and multi-user sessions. Positive owner-scoped `local_single_user` evidence is required; inability to verify it is denial, not permission.

## AI-origin risks

False accusations are the primary product risk. AI-origin output is separated from quality, disabled by default, allowed to abstain, and unable to affect policy, SARIF severity, or exit codes throughout `0.x`. See [AI-origin signal](ai-origin-signal.md).
The first 0.x detector is restricted to a pinned local-child
backend in `strict_offline`: no socket, DNS, runtime download, or cloud
recipient. Its result records `on_device` provenance. A cloud detector requires
a future contract and threat-model review. Backend, model, model-card,
calibration-package, and evaluation-card artifact digests are verified before
use and serialized in the relevant public object.

## Supply chain and licensing

Executables, containers, style packs, model weights, datasets, and base images are pinned and verified before distribution. Separate processes reduce dependency coupling but do not eliminate license, notice, source-offer, or redistribution obligations. Release artifacts include an SBOM and updated third-party notices.

## Required security tests

- strict-offline CLI denial of every socket, including loopback, plus API-hosted tests proving that no analyzer/provider socket is opened beyond the authenticated listener;
- owner-bound stdio MCP tests proving strict-offline socket denial and exact
  planned-child/process-session enforcement for personal provider mode;
- hostile profile keys and YAML payloads;
- Host, Origin, CORS, bearer-token, and DNS-rebinding cases;
- body, timeout, output, rate, and concurrency exhaustion;
- path traversal, symlink/junction, UNC, and device-path cases;
- child-process argument injection and inherited-secret tests;
- accidental API-key precedence and provider-fallback tests;
- exact provider-route/target matching, recipient-specific disclosure, and
  redirect/proxy/DNS/peer denial for connected adapters;
- per-analysis, batch/invocation, probe, and process-session money/request/
  credit reservation and exhaustion tests for loopback HTTP and owner-bound
  stdio MCP;
- fail-closed personal runtime-context, tool-isolation, local-history,
  retention/training, telemetry, and probe-expiry tests;
- log/cache scans for text, excerpts, hashes, secrets, prompts, and responses;
- cancellation and orphan-process cleanup on all supported operating systems;
- proof that AI-origin output cannot influence policy or exit codes.

## Residual risks

Rule engines and semantic providers can reproduce sensitive excerpts in findings. Local administrators and malware can inspect process memory. A provider may retain or use data according to its own contract. Generated suggestions may be wrong. Deterministic output is reproducible only with pinned inputs and versions; local or cloud generative output may not be.

These risks must be displayed at the point where a user enables the relevant capability, not hidden only in this document.
