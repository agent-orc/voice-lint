# AGENTS.md — Voice Lint

This file applies to the entire repository.

## Current project phase

Voice Lint is in the design and bootstrapping phase. Public commands, schemas, and APIs in the documentation are proposed contracts until an implementation and tests exist.

Do not describe a planned capability as shipped. Keep README status, usage documentation, schemas, and implementation status aligned.

## Product invariants

- Quality analysis and AI-origin signals are separate outputs.
- AI-origin signals are experimental, opt-in, and allowed to abstain.
- Never present an AI-origin result as proof of authorship.
- AI-origin signals cannot affect CI or content policy anywhere in the `0.x` contract.
- The first 0.x AI-origin backend is local-only, socket-free, and reports on-device provenance; cloud detection needs a future contract.
- Every actionable finding identifies its engine, category, severity, evidence span, and explanation.
- A scalar score alone never blocks publication; blocking requires concrete active findings. Missing required capability or coverage produces `incomplete`, not editorial failure.
- `strict_offline` analysis performs no analyzer/provider socket access; its CLI process opens no sockets. If invoked through the local API, the authenticated API listener is the sole transport exception. Loopback analysis services belong to `local_connected`.
- The core is provider-agnostic and does not depend on Agent Orchestrator.
- The analyzer explains by default; full-document rewriting is outside the core.
- Existing consumer subscriptions may only be used through officially documented SDKs or CLIs.
- Never scrape a chat UI, copy browser cookies, extract OAuth credentials, or call an undocumented provider backend.
- Personal subscription adapters are local single-user features and must fail closed in CI, containers, shared runners, proxies, remote binds, or multi-user contexts.
- Input text is not logged or persisted by default.
- Caching is off by default. Never put unsalted content hashes, excerpts, prompts, or model output in default logs.

## Configuration trust boundary

- A repository-owned `VoiceProfile` may define language, terminology, rules, examples, warning thresholds, and finding policy.
- A `VoiceProfile` must never select a provider, endpoint, credential, executable, runtime mode, process permission, provider fallback, or billing fallback.
- Those capabilities belong only to an explicitly selected, user-owned `RuntimeConfig` outside an untrusted repository.
- The safe default is `strict_offline`; any loopback or external data transfer requires explicit runtime opt-in.
- `allow_provider_fallback` and `allow_paid_fallback` are independent and default to `false`.
- A primary metered `byok_cloud` call needs separate explicit paid-execution authorization and a cost ceiling; fallback authorization never grants it.

## Transport invariants

- The local HTTP API requires a random per-session bearer token, exact Host checks, Origin checks, no permissive CORS, and body/rate/concurrency limits.
- HTTP requests select only pre-registered `profile_id` values and never accept arbitrary profile/file paths, provider endpoints, or credentials.
- Personal-cloud execution through a locally started vendor client still sends selected text to that provider's cloud.

## Change requirements

When behavior changes:

1. update the relevant contract or schema;
2. add or update German and English fixtures;
3. document any scoring or compatibility change;
4. increment the ruleset, profile schema, or API version when comparability changes;
5. test Unicode spans, Markdown exclusions, offline behavior, and degraded provider behavior where applicable.

## Architecture direction

Keep these concerns separate:

- contracts and schemas;
- document parsing and source mapping;
- deterministic analyzers;
- external grammar/style adapters;
- voice-profile analysis;
- semantic judge providers;
- score aggregation and policy;
- reporters and transports.

Provider errors, missing subscriptions, timeouts, and exhausted quotas must reduce reported coverage or trigger a documented fallback. They must not silently produce a complete-looking score.

Vale receives the original markup text and format. Native metrics receive the internal document model. LanguageTool receives mapped prose segments. Do not normalize all engines through one lossy input representation.

## Documentation style

- Primary project documentation is written in English.
- Prefer concrete examples and explicit limitations.
- Use “SLOP” only for named, explainable quality patterns.
- State whether an example is implemented, experimental, or planned.
- Link technical or policy claims to current primary sources.
