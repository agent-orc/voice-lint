# Product scope

Status: initial design, 2026-08-09

Product priority revised 2026-09-06: [the JS review library and local Voice
Studio](on-page-review.md) add on-page website and rendered/source Markdown
review, human-created feedback, explicitly saved repository sidecars, and
reviewed proposals. The analyzer still explains; guarded source editing belongs
to the review service. Registry absence means an unverified claim, not proof
of falsehood. The scope below describes the broader analysis core. No shipped
capability is implied by this revision.

## Product statement

Voice Lint is an open-source quality gate for prose with a project-specific voice.

It answers:

1. Does this text follow the explicit rules of this project?
2. Does it exhibit identifiable SLOP patterns such as generic openings, empty emphasis, redundancy, or low information density?
3. How closely does it match the project's versioned voice profile?
4. Which concrete passages should a human or rewriting agent review?

It does not reduce these questions to “was this written by AI?” A weak text can be human-written, and a strong text can be AI-assisted.

## Primary users

The initial user is a developer, technical writer, consultant, founder, or independent publisher who:

- maintains several recurring text projects;
- wants a distinct voice per project;
- stores content in files or can call an API;
- already pays for one or more AI tools;
- wants local control and reproducible results;
- needs more than an ad-hoc prompt in a chat window.

The next expansion users are small agencies and documentation or content teams that manage several client or brand profiles.

## Primary use cases

### Repository quality gate

Check Markdown and plain-text files before commit, pull request, or publication.

### Project voice regression

Compare a changed document with a versioned profile and the project's accepted reference texts.

### Agent output review

Let an agent orchestrator submit a draft, receive structured findings, and run a bounded correction loop.

### Batch review

Scan an existing documentation or content repository and establish a baseline without requiring all historical findings to be fixed immediately.

### Local API

Expose the same analysis contract on loopback so editors, scripts, and local applications do not need to understand individual provider CLIs.

## Core-MVP capabilities (M0–M3)

- German and English.
- Plain text and Markdown.
- Files, directories, stdin, and direct text requests.
- Versioned YAML voice profiles.
- A strict trust boundary between repository voice profiles and user-owned runtime configuration.
- Deterministic SLOP and project-rule checks.
- Evidence spans with line and column information.
- Raw measurements, quality dimensions, applicability, and coverage reporting.
- Text, JSON, and SARIF output.
- CLI and authenticated loopback HTTP API.
- `strict_offline` CLI operation without sockets; through HTTP, the protected loopback listener is the only socket and analyzers/providers open none.
- Optional local LanguageTool integration in a separate `local_connected` mode.
- Exclusions, reviewed suppressions, and baselines.
- Stable exit-code and failure semantics for CI.

## Post-MVP capabilities

- M4 semantic beta: an optional advisory-only judge interface, one local
  reference adapter, and one explicitly selected existing-subscription adapter;
  provider output cannot create policy-eligible findings.
- M5 public beta: calibrated German and English aggregate scores, packaging, evaluation results, and signed release artifacts.
- M6 experiment: one separately evaluated AI-origin signal with abstention.

Existing subscriptions are a useful personal mode, but they are not a dependency of the open-source core and are not routed through Voice Lint as a shared service.

## Explicit non-goals for the MVP

- Replacing LanguageTool or another full grammar checker.
- Factual verification, citation validation, or plagiarism detection.
- A browser extension, desktop editor, or collaborative SaaS.
- Full-document automatic rewriting.
- Training on unreviewed user content.
- Support for languages other than German and English.
- User, team, billing, or profile-database management in the local server.
- Definitive human-versus-AI classification.
- High-stakes educational, employment, compliance, or disciplinary decisions.

## Quality dimensions

All quality dimensions use 0–100, where higher is better.

| Dimension | Measures | Does not measure |
|---|---|---|
| Clarity | Directness and comprehensibility | Factual correctness |
| Specificity | Concrete claims and wording | Source quality |
| Concision | Redundancy, filler, and detours | A universally ideal length |
| Information density | Useful statements relative to verbal volume | Completeness of domain knowledge |
| Voice fit | Agreement with the selected project profile | Universal writing quality |
| Rhythm | Variation in sentence length, openings, and structure | Literary merit |
| Structure | Useful organization of paragraphs, lists, and headings | Correctness of the underlying argument |

SLOP risk is a separate 0–100 measure where higher is worse. The initial SLOP taxonomy includes:

- formulaic openings and conclusions;
- generic transitions;
- empty intensifiers and unsupported superlatives;
- vague attribution;
- abstract claims without concrete content;
- semantic repetition;
- excessive triples and symmetric constructions;
- heading and list overload;
- meta-commentary about the text itself;
- marketing clichés;
- monotonous sentence openings or lengths;
- profile-specific forbidden wording.

Every SLOP finding must map to a named category. “Sounds like AI” is not a valid rule.

## Score semantics

- Before M5 calibration, aggregate scores are null with independent `quality_score_status: uncalibrated` and `slop_risk_status: uncalibrated`; findings, raw metrics, and coverage remain useful.
- After calibration, scores are comparable only with the same profile, ruleset, analyzer, judge, calibration, and language versions.
- A response reports coverage for each dimension and for the total analysis.
- A dimension score is null when there is not enough applicable evidence.
- The overall quality score is null below the configured minimum coverage; the proposed default is 0.60.
- Provider failure reduces coverage or selects a visible fallback.
- Changes that materially alter scores require a ruleset or analyzer version change.
- A low score may warn, but cannot block by itself. Blocking content policy requires concrete findings.

The normalization, aggregation, and status contracts are defined in [Scoring and policy](scoring.md).

## AI-origin signal

AI-origin analysis is a separate experimental module, disabled by default.

Required behavior:

- output “not run”, “unsupported”, or “insufficient evidence” when appropriate;
- use risk bands, not a fabricated probability of authorship;
- disclose text-length, language, domain, paraphrasing, translation, and mixed-authorship limitations;
- never affect the quality score;
- never affect CI or content-policy exit codes anywhere in the `0.x` contract;
- never state that a text was definitively written by AI or by a human;
- publish a model and limitations card for every detector backend;
- restrict the first 0.x backend to pinned on-device execution with no sockets or runtime downloads, and report that provenance.
- require both trusted backend selection and a current-request opt-in alongside
  a quality check; reject AI-only requests before analysis;

See [AI-origin signal](ai-origin-signal.md).

## Product principles

### Evidence before verdict

A user should be able to inspect the affected passage and understand why it was flagged.

### Profiles as code

Profiles, rule policies, examples, thresholds, and baselines belong in version control.

Provider, credential, endpoint, network, process, and billing settings do not. They belong to trusted user-owned runtime configuration outside an untrusted repository.

### Local first

Useful analysis must remain available without a cloud account. `strict_offline` means no sockets for the CLI process and no analyzer/provider sockets behind the API listener. `local_connected` permits only hardened Voice Lint connections to explicit loopback/IPC services; it does not attest a separately managed sidecar's own egress. `personal_cloud` is a separate opt-in mode in which selected text leaves the machine.

### Provider optionality

The core cannot depend on one model vendor. Subscription, BYOK, and local engines are adapters.

### Graceful degradation

If an optional engine is missing or exhausted, Voice Lint reports reduced coverage instead of pretending that every check ran.

### Analysis before rewriting

The core produces findings and focused suggestions. A human or external agent decides whether and how to rewrite.

## Success criteria

The core MVP is useful when a user can:

1. create a profile in less than ten minutes;
2. check a German or English repository locally;
3. understand every blocking finding;
4. reproduce the offline result with pinned versions;
5. call a protected loopback API without exposing file paths, credentials, or provider selection to requests;
6. suppress a noisy finding with an explicit reason or accept it into a reviewable baseline;
7. improve the project profile over time without granting the repository runtime capabilities.

The semantic beta is useful when the same user can explicitly select an already installed, officially authenticated provider without giving Voice Lint raw credentials, see exactly which data recipient and billing path ran, and fall back to rules-only analysis without silently contacting another provider.
