# Research and dependency notes

Reviewed: 2026-08-09

This is an engineering assessment, not legal advice. Provider terms, quotas, SDK maturity, and package licenses must be reviewed again before each adapter release.

For product categories, incumbent positioning, and the proposed wedge, see [Market landscape](market-landscape.md).

## Research conclusions

1. Voice Lint should not build a grammar checker or a second generic prose-rule engine.
2. Vale is selected as the reusable base for markup-aware project rules and DE/EN Voice Lint style packs.
3. A self-hosted LanguageTool sidecar is selected as the optional German and English grammar engine in `local_connected` mode; it is not part of `strict_offline`.
4. Small, transparent metrics should cover rhythm, repetition, readability, and information-density proxies.
5. A semantic model is optional and evaluates only ambiguous candidates.
6. Existing AI subscriptions can be considered only through documented vendor CLIs or SDKs and only in a user-initiated, local, single-user adapter in Voice Lint 0.x; each provider still needs an explicit terms gate.
7. Provider authentication is not a single abstraction: each adapter has a different allowed deployment scope.
8. AI-origin detection remains a separate experimental signal with abstention and published limitations.
9. The main original open-source asset should be the German and English rule corpus, voice-profile format, calibration data, and evaluation suite.
10. A locally spawned vendor CLI is not local inference: it normally transfers the submitted text to the vendor cloud. Only a verified local-model path can claim that content stays on-device.

## Reusable open-source components

| Component | Role | License | DE/EN | Initial decision |
|---|---|---|---|---|
| [Vale](https://github.com/vale-cli/vale) | Markup-aware prose rules, terminology, repetition, consistency | MIT | Rule content is language-specific | Selected primary rule worker |
| [LanguageTool](https://github.com/languagetool-org/languagetool) | Grammar, spelling, established language rules | LGPL-2.1-or-later | Strong German and English coverage | Selected optional `local_connected` sidecar; no bundling before the Distribution ADR |
| [Harper](https://github.com/Automattic/harper) | Fast local grammar through Rust/WASM | Apache-2.0 | English only at review time | Evaluation candidate; `harper.js` is early access |
| [textlint](https://github.com/textlint/textlint) | Extensible AST-based JavaScript linter | MIT | Depends on rule packs | Evaluation-only alternative to Vale, not a parallel MVP engine |
| [llm-slop-detector](https://github.com/mandakan/llm-slop-detector) | Phrase, punctuation, Unicode, and structural heuristics | MIT for the repository and core; pack-level notices for derived optional packs | Predominantly English | Research source only; import rules only with rule-level provenance |
| [Synthesis content-quality](https://github.com/synthesisengineering/synthesis-skills/blob/main/skills/synthesis-content-quality/SKILL.md) / [Slopcheck](https://github.com/synthesisengineering/synthesis-slopcheck) | LLM-judge taxonomy and methodology | Content skill declares CC0-1.0; Slopcheck README declares the app MIT, but no root license text/file was present at review time | Primarily English | Methodology research only; verify artifact-level license before copying code |
| [TextDescriptives](https://github.com/HLasse/TextDescriptives) | Linguistic and readability metrics on spaCy | Apache-2.0 | Depends on component and spaCy model | Later Python-worker candidate only after per-language validation |
| [textstat](https://github.com/textstat/textstat) | Python readability and text metrics | MIT | Includes language-aware behavior | Comparison oracle for native metrics, not an MVP runtime dependency |
| [mStyleDistance](https://huggingface.co/StyleDistance/mstyledistance) | Multilingual style embeddings | MIT model repository | Includes German and English evaluation material | Later experiment for reference-voice distance |

The Core MVP selection is Vale in `strict_offline` and an opt-in LanguageTool sidecar in `local_connected`. Harper and textlint remain explicit evaluation candidates; neither is a second active rule engine in the MVP.

### Vale

Vale describes itself as “code-like linting for prose”, understands common markup formats, and supports custom YAML style rules. Its official documentation covers [style rules](https://vale.sh/docs/styles), [CLI usage](https://vale.sh/docs/cli), and [custom output templates](https://vale.sh/docs/templates).

Use it for:

- preferred and forbidden terminology;
- formulaic phrases;
- substitutions;
- repetition and consistency;
- project-specific wording;
- markup-aware source locations;
- versioned VoiceLint-DE and VoiceLint-EN style packages.

Do not assume that the MIT license of the Vale engine applies to third-party style packages. Every bundled package needs its own license review and attribution.

### LanguageTool

LanguageTool provides an open-source grammar and style checker for German, English, and more than twenty other languages. The project documents an [embedded HTTP server](https://dev.languagetool.org/http-server.html) and advises against automated use of the free public endpoint in its [public API documentation](https://dev.languagetool.org/public-http-api.html).

Use a pinned, explicitly configured loopback sidecar only in `local_connected`, and normalize its offsets, rule IDs, categories, and suggestions into the Voice Lint finding contract. The `strict_offline` path must not start or contact LanguageTool because even loopback HTTP opens sockets.

The adapter disables redirects and proxies, resolves no hostname, verifies the
actual loopback peer, and ignores response-supplied URLs. This constrains Voice
Lint's connection; it does not prove that the independently managed sidecar
has no updater, cloud proxy, telemetry, or other egress, so that component
remains an explicit user trust decision.

Before Voice Lint bundles a LanguageTool archive or JAR, publishes a container containing it, or adds an automatic downloader, accept a Distribution ADR. The ADR must record the exact artifacts, acquisition and update path, modification status, corresponding-source and notice obligations, container and package boundaries, and the resulting release procedure. Until then, Voice Lint may connect only to a user-installed sidecar. Process separation simplifies lifecycle isolation; it does not waive license or distribution obligations.

Do not:

- depend on the public free endpoint;
- rebuild grammar rules in Voice Lint;
- claim that the self-hosted open-source server includes proprietary cloud AI checks;
- embed or distribute the LGPL component without reviewing the resulting obligations.

### Harper and textlint

Harper is attractive for a future lightweight English-only local client, but its repository states that it currently supports only English. Its Node/browser integration, [`harper.js`](https://writewithharper.com/docs/harperjs/introduction), uses WASM and is explicitly documented as early access with an unstable API. textlint is a credible alternative when an in-process Node rule engine is essential, but operating it together with Vale would duplicate rule configuration, suppressions, messages, and fixes.

Evaluate Harper against LanguageTool for an English-only low-resource mode and textlint against Vale only if deployment constraints demand an in-process engine. The MVP selects Vale and LanguageTool; it does not ship either evaluation candidate.

### Existing SLOP projects

[llm-slop-detector](https://github.com/mandakan/llm-slop-detector) provides a deterministic English-oriented collection and integrations. Its repository is MIT, and its notices state that the core `builtin-rules.json` contains no third-party content. Optional packs are separate: some are original and others derive from MIT- or Apache-2.0-licensed sources with pack-level notices. “MIT plus notices” is therefore not a sufficient import decision; every imported rule needs source, license, attribution, version, and local evaluation metadata.

[Synthesis Slopcheck](https://github.com/synthesisengineering/synthesis-slopcheck) demonstrates a useful LLM-judge workflow, but licensing must be evaluated by artifact. The [Synthesis Skills repository](https://github.com/synthesisengineering/synthesis-skills#licensing) assigns CC0-1.0 to methodology and content skills and Apache-2.0 to skills with executable scripts; `synthesis-content-quality` declares CC0-1.0. The Slopcheck README declares its web app MIT and fetched skill files CC0-1.0, but no root license-text file was present at review time. Preserve that distinction and obtain the actual license text before redistribution.

They are useful for:

- category discovery;
- negative and positive fixtures;
- comparison benchmarks;
- license-compliant inspiration only from artifacts whose file-level license is explicit.

They are not accepted as a calibrated German quality score. Typographic features such as em dashes, quotation marks, or guillemets must not be treated as general AI or SLOP evidence, especially in German.

The paper [Measuring AI “Slop” in Text](https://arxiv.org/abs/2509.19163) is a useful starting point for an annotation taxonomy, not a ready production engine.

### Metrics candidates

[`textstat`](https://github.com/textstat/textstat) is a Python library. Use it in development as a comparison oracle for locked DE/EN fixtures while implementing small native TypeScript metrics. Do not add it to the runtime or claim formula equivalence until fixture comparisons pass. A production Python worker requires a separate runtime ADR covering packaging, startup, isolation, updates, and platform support.

[TextDescriptives](https://hlasse.github.io/TextDescriptives/) is also a later Python-worker candidate, not blanket “multilingual” evidence. Its components have different linguistic dependencies; its convenience extractor can select or download a spaCy model from a language code, and some resources are unavailable for some languages. Before enabling any metric for German or English:

- pin the exact TextDescriptives, spaCy, model, and resource versions;
- disable runtime model downloads;
- validate each language-and-component pair against labeled fixtures;
- mark missing, unsupported, or non-finite measurements as not applicable rather than zero;
- document which metrics are language-independent, formula-localized, or parser/model-dependent.

## Proposed deterministic stack

~~~text
strict_offline
  Document -> parser/source map -> Vale + native metrics
                                      |
                                      v
                         normalized findings/measurements

local_connected (explicit opt-in)
  strict_offline result + loopback LanguageTool sidecar
                                      |
                                      v
                         merged normalized findings
~~~

Voice Lint owns normalization, de-duplication, coverage, scoring, profiles, policy, versioning, and evaluation. Vale and LanguageTool remain replaceable engines.

### MCP transport and result contract

The current [MCP 2026-07-28 stdio transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
is a client-launched subprocess carrying newline-delimited UTF-8 JSON-RPC. The
[tool specification](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
supports JSON Schema input and output contracts, `structuredContent`, a
backwards-compatible text serialization, and `resultType: complete`. Voice Lint
therefore selects stdio for its initial local server, emits protocol data only
on stdout, and sends bounded diagnostics only to stderr. It does not implement
Streamable HTTP/SSE in 0.x.

The current protocol has no implicit state handle or connection-scoped session.
Voice Lint tools are stateless at the domain level: comparisons receive both
results, explanations resolve installed rule metadata, and file operations use
trusted server configuration rather than an MCP roots grant. The term
`process_session_budget` refers only to the lifetime of the directly launched
Voice Lint OS process and its provider child, not to protocol session state.

## Existing-subscription providers

“Local adapter” describes where the vendor client process runs, not where inference happens. Codex, Copilot, Gemini CLI, and Claude Code normally transmit submitted content to their provider cloud. The result contract and consent UI must expose that transfer; only a verified local-model adapter may report an on-device data path.

Voice Lint 0.x adopts a stricter deployment policy than the broadest automation some vendors document: personal-subscription credentials are never used in CI, a shared server, or a multi-tenant service. A personal adapter is user-initiated, local-only, and single-user; when it is network-served, that listener is loopback-only. Foreground CLI execution and owner-bound stdio MCP remain local process paths rather than network listeners. CI and shared deployments use `strict_offline`, a verified local model, or explicit BYOK/service credentials. A vendor-documented enterprise or per-user OAuth integration is a separate future adapter with its own terms, security, privacy, and billing review.

### Provider matrix

| Provider | Documented personal/local path | Shared or multi-user evidence | Voice Lint 0.x boundary |
|---|---|---|---|
| OpenAI Codex | Codex CLI, `exec`, and SDK | API keys are documented for shared automation; App Server auth modes do not by themselves establish a public multi-tenant ChatGPT-plan route | Official `exec` for personal-local use; API/BYOK for CI or shared use |
| GitHub Copilot | Stored CLI login or SDK | GitHub documents per-user OAuth, but usage consumes the user's Copilot allowance and may incur paid overage | Personal-local only; hosted OAuth is future work |
| Gemini CLI | Headless CLI and automation use | Gemini CLI OAuth must not be harvested or piggybacked; Google directs third-party agents to API or Vertex credentials | Official headless CLI for personal-local use; ACP is future work |
| Claude Code | Documented local programmatic CLI mechanics | Anthropic requires prior approval for third-party Claude.ai login/Free-Pro-Max routing; no general local-wrapper exception is established | Subscription adapter blocked pending written approval or clarified terms; API/cloud credentials only |
| Local model | No subscription required | Depends on deployment and model license | Verified loopback endpoint with explicit model/license provenance |
| Metered API | Explicit API billing | Standard production option | Separate BYOK or service adapter |

### OpenAI Codex

Official OpenAI documentation states that:

- [Codex non-interactive mode](https://developers.openai.com/codex/non-interactive-mode) is intended for scripts and CI and recommends API-key authentication as the default for automation;
- the [Codex SDK](https://developers.openai.com/codex/codex-sdk) controls local Codex agents programmatically;
- the [Codex App Server](https://developers.openai.com/codex/app-server) exposes an integration protocol with API-key, managed ChatGPT, and experimental externally managed ChatGPT-token auth modes;
- [Codex pricing](https://developers.openai.com/codex/pricing) distinguishes included ChatGPT-plan usage from separately metered API-key usage and describes API keys as suitable for shared CI environments.

Those pages document client and authentication mechanics. They do not establish that an unrelated public service may pool one maintainer's plan, relay one person's session to other users, or treat App Server authentication as a production multi-tenant subscription entitlement. Voice Lint must not infer that permission. Its 0.x subscription adapter remains personal-local; CI and shared service deployments require explicit API/BYOK or other service credentials.

Initial decision:

- use an ephemeral, read-only official `exec` process for stateless personal-local analysis;
- pass content over stdin;
- request structured output and validate it locally;
- never read the Codex credential store;
- do not silently switch to an API key;
- report the observed auth class, billing class, cloud data path, client version, and usage metadata;
- move to an SDK or stdio App Server only when startup overhead justifies the additional lifecycle complexity.

Official documentation marks both the `app-server` command and its WebSocket transport experimental and unsupported for production workloads. Any App Server adapter remains experimental regardless of transport until that status changes.

### GitHub Copilot

GitHub provides a [Copilot SDK authentication guide](https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/authenticate) for stored user login, OAuth, automation tokens, and BYOK. Its [GitHub OAuth setup](https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/github-oauth) explicitly states that applications can act for each authenticated user and bill usage to that user's Copilot subscription.

This is the clearest documented future per-user route, but it is not free or billing-neutral. Current [Copilot billing](https://docs.github.com/en/copilot/concepts/billing) uses included GitHub AI Credits, and usage after an allowance can be blocked or charged as additional usage according to the account's budget and overage configuration. Eligible annual plans can remain on legacy premium-request billing until their term ends. A future adapter must show the applicable allowance class and must not enable paid additional usage implicitly.

The SDK [entered public preview on April 2, 2026](https://github.blog/changelog/2026-04-02-copilot-sdk-in-public-preview/) and GitHub [announced core SDK general availability on June 2, 2026](https://github.blog/changelog/2026-06-02-copilot-sdk-is-now-generally-available/). Some individual features and documentation can still carry preview notices, so record maturity per capability rather than labeling the whole SDK preview. Therefore:

- pin the SDK and bundled CLI;
- mark any preview capability experimental and probe it on the pinned version;
- use an empty runtime mode with no OS or filesystem tools;
- isolate every future hosted session per user;
- expose AI-credit or legacy premium-request usage and whether paid overage is possible;
- never share one logged-in user across tenants.

### Gemini CLI

Gemini CLI documents [headless JSON output](https://geminicli.com/docs/cli/headless/) and an [automation guide](https://geminicli.com/docs/cli/tutorials/automation/) that explicitly includes wrapper scripts and batch processing. It also documents [ACP mode](https://geminicli.com/docs/cli/acp-mode/) as a stdio JSON-RPC integration, but ACP adds session and capability lifecycle that the first adapter does not need.

Google also states in the [Gemini CLI FAQ](https://geminicli.com/docs/resources/faq/) and [terms and privacy page](https://geminicli.com/docs/resources/tos-privacy/) that third-party software must not harvest or piggyback its OAuth access to call the underlying service.

Initial decision:

- execute the unchanged official CLI;
- use JSON output and validate the response payload locally;
- use headless mode for the first adapter and defer ACP until the headless boundary is stable;
- require a version-matched, officially documented deny-all tool configuration;
  use an explicitly authorized behavioral isolation self-test only as a
  supplemental regression canary against that exact pinned CLI/configuration,
  never as proof that tools are absent; this fixed synthetic inference may
  consume quota and is not an automatic capability probe;
- fail closed if that self-test observes a tool request, tool execution, MCP connection, extension, hook, project instruction, or filesystem/network side effect;
- never read or reuse the CLI OAuth cache;
- use API or Vertex credentials for a hosted third-party service.

### Claude Code

Anthropic's [programmatic-mode documentation](https://code.claude.com/docs/en/headless) explicitly demonstrates using the CLI as a linter and returning schema-constrained JSON.

Its [authentication documentation](https://code.claude.com/docs/en/authentication) explains credential precedence. A configured API key can override subscription authentication, so the adapter must show the detected billing path and prevent an accidental paid fallback.

Anthropic's [legal and compliance documentation](https://code.claude.com/docs/en/legal-and-compliance) states that third-party developers need prior approval to offer Claude.ai login or route requests through Free, Pro, or Max plan credentials on behalf of users. Programmatic-mode documentation establishes technical mechanics, not a general permission for an unrelated local wrapper.

Anthropic's [June 15, 2026 Help Center update](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) paused the previously announced separate Agent SDK credit. At review time, Agent SDK, `claude -p`, and third-party-app use still draw from subscription usage limits, and the announced monthly credit is unavailable.

Initial decision:

- block a Claude consumer-subscription adapter unless Anthropic provides written approval or public terms clearly authorize this local-wrapper use;
- do not offer Claude subscription login or collect a subscription OAuth token;
- use an explicit API key or supported cloud provider for any implemented Claude adapter;
- if a subscription path is later approved, keep it local single-user and still refuse CI, remote or non-loopback network service, shared, or multi-tenant execution.

## Provider safety requirements

Every delegated provider adapter must:

- start processes with an argument array and shell execution disabled;
- send user text through stdin or a protocol field;
- use a fresh empty temporary working directory;
- construct a documented, adapter-specific child environment allowlist instead of inheriting the parent environment; include only required platform/runtime variables and the deliberately selected auth path, and strip unrelated provider API keys;
- disable tools, plugins, MCP servers, hooks, extensions, memory, and project instructions;
- run content-free static capability probes automatically; require tool denial
  from version-matched official non-inference documentation/metadata or a
  verified tool-less route, otherwise keep the adapter ineligible;
- treat a separate explicitly authorized, version-pinned synthetic behavioral
  self-test only as a supplemental regression canary and account for its own
  disclosure, lifecycle, quota, preflight bound, and cost outside later
  analysis budgets;
- require positive owner-scoped local-single-user evidence and refuse any
  personal-subscription adapter when CI, container, proxy or broker, a remote
  or non-loopback network service, shared execution, or multi-tenant execution
  is detected or cannot be ruled out under the defined checks;
- disclose before execution that a local vendor CLI still transfers content to that vendor's cloud;
- impose hard time, concurrency, input, and output limits;
- terminate the complete child process tree on cancellation;
- validate output locally against the Voice Lint schema;
- permit no more than one structured repair attempt;
- expose the exact provider route and capability maturity, model, client
  version, auth/billing class, per-recipient disclosure, data path, local-client
  persistence, provider retention/training, telemetry, quota/cost usage,
  immutable verification references, runtime context, and fallback provenance;
- default to one concurrent request per personal subscription;
- never read cookies, browser storage, or private CLI OAuth files;
- do not implement a semantic cache in M4; require a future provenance/privacy
  ADR before introducing one;
- default both provider fallback and paid fallback to false.

Provider fallback and paid fallback are separate decisions.
`allow_provider_fallback` controls whether Voice Lint may move to another exact,
trusted allowlist target/configuration/route; Voice-Lint-initiated automatic
model fallback is not supported in 0.x. `allow_paid_fallback` controls whether
a subscription or included-allowance path may switch to separately metered API
or overage billing. Enabling one must never imply the other, and neither
authorizes a primary paid or possibly paid call. Per-analysis,
per-invocation/batch, and process-session money/request/quota bounds for
loopback HTTP and owner-bound stdio MCP are reserved before disclosure. Results
record each attempted transition and target outcome, recipient-specific
disclosure and data policy, immutable preflight evidence, and whether any paid
path was authorized and used. Voice Lint 0.x permits at most one fallback
transition per document and never chains targets or tries a second fallback
after the selected target fails.

## AI-origin research

AI-origin detection is not a reliable basis for the quality product.

Research such as [Can AI-Generated Text be Reliably Detected?](https://arxiv.org/abs/2303.11156) discusses fundamental limits, while the [RAID benchmark](https://aclanthology.org/2024.acl-long.674/) shows that detector robustness varies across generators, domains, sampling, and adversarial transformations.

Product consequences:

- no field named probability_ai in the public API;
- no definitive authorship verdict;
- explicit minimum-length and supported-domain gates;
- unsupported and insufficient-evidence outcomes;
- separate calibration per language, domain, detector, and version;
- no effect on quality score;
- no AI-origin execution inside CI and no CI policy integration in any Voice Lint 0.x workflow;
- one pinned local-only 0.x backend with no socket or runtime download, plus explicit on-device execution provenance;
- no use for high-stakes sanctions.

Process provenance, revision history, or signed generation metadata is stronger evidence than post-hoc surface-text classification when such data is available.

## License and supply-chain notes

Voice Lint license: Apache-2.0.

- Vale is MIT, but style packs can have separate licenses.
- LanguageTool is LGPL-2.1-or-later; sidecar/process separation simplifies isolation but does not remove license, notice, source, terms, or distribution obligations.
- Harper is Apache-2.0.
- textlint is MIT.
- llm-slop-detector's repository and core list are MIT; optional derived packs retain their pack-level source licenses and notices.
- the Synthesis content-quality skill declares CC0-1.0, while skills with executable scripts use Apache-2.0; the Slopcheck README declares its app MIT and fetched skills CC0-1.0, but a root license-text file was absent at review time.
- copied or adapted rule packs retain their original attribution and license.
- model weights and datasets require independent license review.
- every bundled binary, ruleset, model, and container base must be pinned and recorded in an SBOM.
- vendor CLIs should initially remain optional user-installed dependencies rather than bundled artifacts.

Keep `THIRD_PARTY_NOTICES.md` populated with exact revisions, copyright, license text, and distribution details before releasing any third-party rules or binaries.

## Evaluation gaps

The largest gap is not another engine. It is a trustworthy German dataset.

Required original work:

- a DE/EN SLOP taxonomy with clear annotation guidance;
- positive and negative examples for every blocking rule;
- project-voice reference corpora with explicit consent and licenses;
- separate German and English thresholds;
- human judgments for usefulness and false positives;
- model- and ruleset-version regression tests;
- comparison against Vale alone, LanguageTool alone, direct LLM prompting, and emerging SLOP tools.

That corpus and its evaluation method are more defensible than a generic judge prompt.
