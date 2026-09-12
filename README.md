# Voice

Review AI-assisted writing in its page context, keep useful text, and apply reviewed changes to the original source.

Voice has a local Studio application and two reusable JavaScript libraries. Work with a Git checkout or an ordinary source folder. English is the default interface language; German is available in Studio and on the product website.

## Use the product

| Component | What it does | Current status |
| --- | --- | --- |
| **Voice Studio** | Shows the running website beside its review, connects passages to source files, saves keep/change decisions, and prepares guarded source edits. | Preview 0.3 for supervised local use. |
| **`@voice/writing-rules`** | Supplies editorial rules, EN/DE examples, local surface checks, contextual prompts and four host-driven LLM tools. | Implemented workspace package; not published to npm. |
| **`@voice/review`** | Displays findings and feedback in HTML and reports selections with UTF-16 source mapping. | Implemented typed library, independent of Angular; not published to npm. |
| **Voice Lint analyzer** | Proposed CLI, profiles, language-engine adapters and CI integration. | Design and examples; no released CLI, API server or GitHub Action. |

The tooling library prepares analysis inputs and returns local signals. The host supplies project context, chooses and runs a model when needed, validates its response and saves decisions. The HTML library displays the supplied review data. Opening the public website does not expose a model service or LLM tools.

## Start Studio

Install Node.js 24, the .NET 10 SDK and Bash. Use Git Bash on Windows.

```sh
git clone https://github.com/RobertMischke/agent-taskboard-devspace.git
cd agent-taskboard-devspace/voice-studio
npm start
```

Open **http://127.0.0.1:5188/** and enter the pairing code from the terminal. `npm start` installs missing dependencies and builds the application. To display the active code again, run this in another terminal:

```sh
npm run pairing-code
```

Leave **Remember this browser for 7 days** enabled to resume access after reloading or reopening the browser. The Studio backend runs locally. Local rules and manual review need no model account; semantic review requires a configured host route and an explicit start.

1. Register a source folder and open a file or its running local website.
2. Select a mapped passage. Keep it as written, inspect a suggestion, or request alternatives through the configured route.
3. Review the complete source diff before applying it. Studio checks the original source version again before writing.

HTML, a supported Markdown subset, and explicitly mapped TypeScript and JSON prose are available. Route mapping is explicit; dynamic application code is not inferred as editable text. Review and file panes resize independently, and the tree retains separate Projects and Files sections.

## Where the code and commits live

| Repository | Contents |
| --- | --- |
| [agent-taskboard-devspace/voice-studio](https://github.com/RobertMischke/agent-taskboard-devspace/tree/main/voice-studio) | Studio frontend/backend, both libraries, tests, benchmarks, research records and the product website. **Product implementation commits go here.** |
| [agent-orc/voice-lint](https://github.com/agent-orc/voice-lint) — this repository | Analyzer design, proposed contracts, examples and the VL-W1 product dossier. |
| `agent-orc/website` | Central ecosystem website and hosting configuration. |

This repository does not contain a second copy of Studio. Use the implementation checkout above to build or change the product. The [VL-W1 dossier](docs/operations/voice-concept-revision/index.html) records the current implementation, verification and remaining work; the broader analyzer specifications remain design documents.

## Website and guides

The product website is being integrated at **https://agent-orchestrator.dev/voice/**. It contains the Studio tour, Library APIs, AI writing patterns, research and HTML guides. The deployment status is recorded in the implementation repository's [website guide](https://github.com/RobertMischke/agent-taskboard-devspace/blob/main/voice-studio/website/README.md).

To run it locally from the implementation checkout:

```sh
npm run website:preview
# http://127.0.0.1:5187/voice/
```

Research records connect each source to current Voice APIs and identify capabilities still missing. The catalogue provides twenty contextual rules and four review profiles; eight rules also have local surface matching. A matched phrase is a candidate for review, not proof of poor writing or AI authorship.

## Quality and model comparisons

The implementation includes [reproducible quality evaluation](https://github.com/RobertMischke/agent-taskboard-devspace/blob/main/voice-studio/benchmarks/writing-review/quality-evaluation.md): frozen inputs, retained model responses, independent human judgments and exact provenance. It reports meaning preservation, missed issues, harmful changes, coverage and observed cost separately.

No model-quality comparison has been completed and no model is a measured price/performance winner. The current EN/DE fixtures and synthetic evaluator tests are development evidence. Quality review and experimental authorship signals remain separate.

## Analyzer design

The planned Voice Lint core analyzes prose against a repository-owned voice profile. Findings identify their rule, engine, evidence span and explanation. Profiles contain editorial policy; runtime configuration selects execution and provider capabilities.

| Design area | Reference |
| --- | --- |
| Scope and implementation stages | [Product scope](docs/product-scope.md), [implementation plan](docs/implementation-plan.md) |
| Proposed CLI, API, CI and MCP contracts | [Planned usage](docs/usage.md) |
| Parsing, engines and adapters | [Architecture](docs/architecture.md) |
| Findings, coverage and calibration | [Scoring and policy](docs/scoring.md) |
| Experimental authorship signals | [AI-origin signal](docs/ai-origin-signal.md) |
| Runtime and data handling | [Privacy](docs/privacy.md), [security](SECURITY.md) |
| Review product design | [On-page review](docs/on-page-review.md) |

These specifications do not establish shipped analyzer capabilities. In particular, proposed `voice-lint` commands are not executable software in this repository.

## Contribute

Product fixes and library changes belong in the implementation checkout. This repository accepts precise rule proposals, labeled EN/DE examples, contract reviews and analyzer design contributions. Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing the proposed contracts.

Voice Lint design material is licensed under [Apache 2.0](LICENSE). Third-party components and rule sources retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
