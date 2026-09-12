# Voice Lint

**Keep your voice. Lint prose like code.**

Voice Lint is a planned open-source quality gate for project-specific writing. It will analyze German and English prose, explain concrete style and SLOP findings, and compare text with a versioned voice profile.

> [!IMPORTANT]
> This repository is in the design and bootstrapping phase. No package, binary, API, or GitHub Action has been released. Commands and payloads below are proposed contracts, not working software.

## Why Voice Lint?

General writing assistants improve one document at a time. Voice Lint is intended for repeatable workflows across projects:

- keep a distinct, reviewable voice per repository;
- flag generic, repetitive, inflated, or low-information language;
- return evidence and source locations instead of only an opaque score;
- run through a CLI, a protected loopback API, CI, SARIF, or MCP;
- use deterministic checks first and semantic judges only for ambiguous cases;
- keep writing quality separate from speculative AI-origin detection.

Every actionable finding must name a rule or semantic category, identify the affected span, explain the issue, and disclose the engine that produced it. “Sounds like AI” is not a rule.

## Delivery scope

| Capability | Target | Status |
|---|---|---|
| Contracts, taxonomy, fixtures, architecture | M0 | In progress: prose design and examples present; schemas, ADRs, workspace, generated types, and CI pending |
| Vale rules, native metrics, profiles, CLI | M1–M2 | Planned |
| Protected loopback API, SARIF, MCP, CI | M3 / core MVP | Planned |
| LanguageTool loopback adapter | M2, optional | Planned |
| Local, subscription, and BYOK semantic judges | M4 semantic beta | Post-MVP |
| Calibrated aggregate scores | M5 public beta | Post-MVP |
| Experimental AI-origin signal | M6 | Post-MVP; local-only and never a 0.x CI gate |

The useful core is not conditional on a cloud account. Until language-specific calibration exists, the API returns findings, raw metrics, and coverage while aggregate scores remain `null` with independent `quality_score_status` and `slop_risk_status` values of `uncalibrated`.
Nothing in the table is released functionality; even M0 is not complete.

## Current product priority: JavaScript library and local Voice Studio

**Voice Studio Preview 0.3 is implemented** in the separate
[Voice Studio workspace](https://github.com/RobertMischke/agent-taskboard-devspace/tree/main/voice-studio),
with an Angular frontend, .NET backend and reusable `@voice/review` JavaScript
library. It connects local running websites and Markdown sources to underlined
findings, text selection, durable feedback, persisted proposals and guarded
source changes. The Agent Studio Angular website is connected through explicit
route and TypeScript content mappings. Semantic review is an explicit optional
Coding-Agent-Runner operation; deterministic reports remain available locally.

The original Quality Studio website remains the selected dictionary-adapter
pilot. Its inline `data-i18n` dictionary is not yet supported for source changes;
those bound edits are rejected. The static example project is a separate fixture.
See the [current dossier status](docs/operations/voice-concept-revision/index.html#voice-studio-current)
for the 12 September 2026 readiness assessment, verified behaviour and remaining limits. Studio is suitable for supervised local editorial use; it is not a released Voice Lint analyzer or an automatic publication gate. The broader Voice Lint analyzer
contracts and roadmap below remain proposed.

The current delivery sequence is [P1–P6 in the product design](docs/on-page-review.md#8-delivery-order-and-ownership).
The M0–M6 table above describes the broader analyzer roadmap, not prerequisites
that must all be completed before trying the review tool.

## Intended CLI usage

Create and validate a repository-owned voice profile:

~~~bash
voice-lint profile init
voice-lint profile validate .voice-lint/profile.yml
~~~

Check a file or directory:

~~~bash
voice-lint check README.md
voice-lint check docs/ --profile .voice-lint/profile.yml
voice-lint check docs/ --profile .voice-lint/profile.yml --format json
~~~

Without `--profile`, the CLI uses exactly `.voice-lint/profile.yml` below the
current working directory. It never searches parent directories, selects a
built-in profile, or chooses a profile separately per input path. A missing
default profile is exit code `2`; monorepos and cross-project batches pass one
explicit profile or run once per project.

A voice profile controls language, terminology, rules, examples, warning thresholds, and finding policy. It cannot select a provider, endpoint, credential, network mode, process capability, or billing fallback. Those settings belong to a trusted, user-owned runtime configuration outside the repository.

## Intended local API usage

Start the server in the first POSIX terminal with trusted runtime settings and
a registered project profile and a portable token-file path:

~~~bash
VOICE_LINT_RUNTIME_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/voice-lint/runtime.yml"
VOICE_LINT_RUN_DIR="${XDG_RUNTIME_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/voice-lint/run}"
VOICE_LINT_SESSION_TOKEN_FILE="$VOICE_LINT_RUN_DIR/session.token"
voice-lint runtime init \
  --output "$VOICE_LINT_RUNTIME_CONFIG" \
  --if-missing
voice-lint runtime profile register agent-orc-documentation \
  --runtime-config "$VOICE_LINT_RUNTIME_CONFIG" \
  --profile "$PWD/.voice-lint/profile.yml"
voice-lint serve \
  --runtime-config "$VOICE_LINT_RUNTIME_CONFIG" \
  --session-token-file "$VOICE_LINT_SESSION_TOKEN_FILE"
~~~

The server creates the parent runtime directory and token file with
owner-only permissions, binds to loopback, rejects unapproved `Host` and
`Origin` values, and does not enable CORS. In a second POSIX terminal, pass only
the non-secret token-file path to the bundled API client. It reads both the
token and document from a protected file or stdin, so neither appears in a
child-process argument list and no Python or curl installation is required:

~~~bash
VOICE_LINT_RUN_DIR="${XDG_RUNTIME_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/voice-lint/run}"
VOICE_LINT_SESSION_TOKEN_FILE="$VOICE_LINT_RUN_DIR/session.token"
printf '%s\n' 'In der heutigen schnelllebigen Welt ...' | \
  voice-lint api analyze \
    --server http://127.0.0.1:4765 \
    --session-token-file "$VOICE_LINT_SESSION_TOKEN_FILE" \
    --profile-id agent-orc-documentation \
    --document-format markdown \
    --input -
~~~

Request bodies never contain file paths, provider keys, endpoints, or subscription credentials. See [Planned usage](docs/usage.md) for the Windows token handoff and the complete draft CLI, HTTP, CI, suppression, and MCP contracts.

## Operating modes

| Mode | Socket and data boundary | Engines | Intended use |
|---|---|---|---|
| `strict_offline` | CLI: no sockets; API: its authenticated loopback listener is the only socket | Vale and native deterministic metrics; analyzers open no sockets | Private work and reproducible CI |
| `local_connected` | Voice Lint connects only to hardened loopback/IPC; a user-managed sidecar's own egress is outside that guarantee | Adds LanguageTool or a user-run local model | Trusted local integrations; model output may be nondeterministic |
| `personal_cloud` | Official local vendor client may send selected text to its cloud | Optional subscription-backed semantic judge | Single-user desktop use only |
| `byok_cloud` | Explicit user API credential and provider endpoint | Metered semantic judge | Private automation and CI |

A locally started vendor CLI is an authentication and execution boundary, not local inference: selected text leaves the machine and the provider's data-handling terms apply. Personal subscription credentials must not be copied into containers, shared runners, CI, or a hosted proxy.

A future shared `service` deployment is a separate product and threat-model boundary, not another personal runtime mode. It requires service identities or a self-hosted model, tenant isolation, authentication, authorization, retention policy, and abuse controls.

Provider and paid fallbacks are separate settings and both default to `false`. Failure in an optional semantic provider falls back only to rules-only analysis unless the user explicitly consents to a different data recipient and billing path.

## Analysis model

The planned quality dimensions are clarity, specificity, concision, information density, rhythm, structure, and voice fit. SLOP is represented by named findings such as formulaic openings, vague attribution, empty intensifiers, semantic repetition, or project-specific forbidden wording.

Aggregate quality and SLOP scores are versioned, calibrated views over findings and measurements. They are not objective literary grades, and a score alone can never block publication. See [Scoring and policy](docs/scoring.md).

Possible AI origin is a separate experimental signal requiring both trusted
runtime enablement and a current-request opt-in alongside a quality check. It
may abstain, is not proof of authorship, never changes quality scores, and
cannot fail CI throughout the `0.x` contract. See [AI-origin signal](docs/ai-origin-signal.md).

## Selected technical direction

- **Vale** is the initial markup-aware rule engine and receives original source text.
- **Native analyzers** provide small, transparent metrics on an internal document model.
- **LanguageTool** is the selected optional grammar adapter in `local_connected` mode.
- **Harper** and **textlint** remain evaluation candidates, not parallel MVP engines.
- Semantic providers are isolated optional adapters after the deterministic core works.

Voice Lint owns contracts, profiles, result normalization, source mapping, coverage, policy, evaluation, and the original DE/EN rule corpus. Separate processes isolate runtime dependencies, but do not remove the license obligations of redistributed components.

## Project boundaries

The first implementation will analyze and explain text. It will not:

- replace a complete grammar checker;
- verify facts, sources, or plagiarism;
- automatically rewrite entire documents;
- claim definitive human or AI authorship;
- make academic, employment, compliance, or disciplinary decisions;
- expose personal AI subscriptions as a shared service.

The Agent Orchestrator may consume Voice Lint through CLI, HTTP, or MCP. Voice Lint does not depend on it and does not autonomously publish or rewrite content.

## Repository map

~~~text
.
├── .gitignore
├── AGENTS.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md
├── THIRD_PARTY_NOTICES.md
├── docs/
│   ├── ai-origin-signal.md
│   ├── architecture.md
│   ├── implementation-plan.md
│   ├── market-landscape.md
│   ├── on-page-review.md
│   ├── operations/
│   │   └── voice-concept-revision/
│   │       ├── brief.md
│   │       ├── index.html
│   │       ├── workbench.json
│   │       ├── measurements.md
│   │       ├── measure.py
│   │       ├── _extract.py
│   │       └── _metrics.py
│   ├── privacy.md
│   ├── product-scope.md
│   ├── research.md
│   ├── scoring.md
│   └── usage.md
└── examples/
    ├── analysis-result.json
    ├── bad-examples/
    │   └── generic.md
    ├── good-examples/
    │   └── direct.md
    ├── runtime-config.yml
    └── voice-profile.yml
~~~

## Documentation

- [JavaScript review library, local Voice Studio and Markdown workflow](docs/on-page-review.md)
- [Concept dossier, including the current product revision](docs/operations/voice-concept-revision/index.html#on-page-review)
- [Product scope](docs/product-scope.md)
- [Planned usage](docs/usage.md)
- [Architecture](docs/architecture.md)
- [Implementation plan](docs/implementation-plan.md)
- [Market landscape](docs/market-landscape.md)
- [Scoring and policy](docs/scoring.md)
- [AI-origin signal](docs/ai-origin-signal.md)
- [Privacy and threat model](docs/privacy.md)
- [Research and dependency notes](docs/research.md)

## Contributing

The most useful early contributions are contract review, labeled German and English fixtures, precise rule proposals, packaging spikes, and safety tests. Read [CONTRIBUTING.md](CONTRIBUTING.md) before starting implementation work.

## License

Voice Lint is licensed under the [Apache License 2.0](LICENSE). Third-party components and rule sources retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
