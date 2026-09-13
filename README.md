# Voice

Review AI-assisted writing in its original source. Open a local website or source
folder, inspect a passage, keep it as written or prepare a change with a source
diff. Work in a Git checkout or an ordinary folder.

| Component | What it provides |
| --- | --- |
| **Voice Studio** | Local Angular/.NET application for browsing, review decisions, source proposals and explicit agent tasks. |
| **`@voice/writing-rules`** | Tooling library: editorial rules, prompt composition, local phrase checks and an LLM tool-use interface for host applications. |
| **`@voice/review`** | Framework-independent HTML library: text selection, finding annotations and the local website bridge. |

Studio is **Preview 0.3**. Both libraries have TypeScript declarations and editor
IntelliSense; consume them from this workspace. They are not published npm packages.

## Start the application

Install **Node.js 24**, **.NET SDK 10** and **Bash**. On Windows, use Git Bash.

```sh
git clone https://github.com/agent-orc/voice-lint.git
cd voice-lint
npm start
```

The launcher installs missing dependencies, builds the libraries, frontend and
backend, and starts the local application:

- **Studio:** [http://127.0.0.1:5188/](http://127.0.0.1:5188/)
- **Example website:** [http://127.0.0.1:5189/index.html](http://127.0.0.1:5189/index.html)

Enter the pairing code printed in the terminal. To show it again, run this command
from the same folder in another terminal:

```sh
npm run pairing-code
```

**Remember this browser for 7 days** is selected by default. The same browser
profile and local address can resume after reloads and restarts. Sign out revokes
that browser's access. [Session details](docs/browser-session.md) explain expiry
and temporary sessions. Stop the foreground application with Ctrl+C.

## Review a website or folder

1. Open **Projects and files** and register the original source folder.
2. Open a file or enter the running application's local development URL.
3. Select a mapped passage. Choose **Keep as written**, inspect a finding or
   request one to three alternatives through a configured model route.
4. Review the proposed source diff and apply it when ready. Check the changed
   file and the actual rendered page.

HTML and Markdown work with the built-in adapters. TypeScript content and JSON
prose require explicit file configuration. The adapters retain exact UTF-16
source spans and preserve string escaping. Dynamic expressions, imports and
arbitrary application code are outside this analysis.

For a live application, configure route-to-source mappings and enable the
[development bridge](packages/review/LIVE-BRIDGE.md). A file assignment alone does
not prove that visible text matches its source. The connection badge shows
mapping counts and opens source selection and connection details.

English is the default; German is available. Full, Compact and Website focus
share an adjacent, resizable review pane. The project/file sidebar has a separate
splitter and independently collapsible sections. In focus mode, the navigation
controls can be moved with mouse, touch or keyboard. Widths, section states and
language are remembered in the browser. See [workspace controls](docs/usability.md).

Decisions, feedback, tasks and proposals live in the project's `.voice-lint/`
folder and refer to source versions. External edits make old results stale.
The [workflow and storage reference](docs/workflow.md) contains file trees, JSON
examples and the task lifecycle.

Model reviews and source tasks use a configured
[Coding-Agent-Runner route](docs/runner-integration.md). No model route is enabled
by default. Opening a document or saving feedback does not call a model. A saved
task requires an explicit start; a source proposal requires a separate apply.

## Use the libraries

**Tooling:** `@voice/writing-rules` contains twenty contextual rules, four task
profiles and English/German instructions. Its static scanner matches sixteen
published phrase patterns across eight rules and reports candidates plus coverage.
It does not determine authorship or validate factual claims.

The [tool-use API](packages/writing-rules/TOOLS.md) lets a host register four
read-only tools: retrieve rules, compose a review prompt, scan local phrases and
read supplied model-comparison evidence. The host supplies its models, execution
and evidence. The package makes no provider requests. See the
[writing API](docs/writing-rules.md) for examples and limitations.

**HTML visualization:** `@voice/review` renders findings supplied by a host and
reports selections through callbacks. It has no Angular dependency. Use its ESM
package or standalone browser bundle. The [integration guide](packages/review/README.md)
and [typed examples](docs/library-types.md) cover mounting, updates and disposal.

Studio currently uses four local backend rules and its configured Runner prompts.
It does not automatically use all twenty tooling-library rules.

[Quality benchmarks](benchmarks/writing-review/quality-evaluation.md) compare
recorded responses against human judgments, keeping quality and cost separate.
Frozen input hashes and deterministic evaluation support replay. The current
development fixtures do not establish a production model or price/performance winner.

## Website, research and guides

Start the static website preview in another terminal:

```sh
npm run website:preview
# Open http://127.0.0.1:5187/voice/
```

The [Voice website](https://agent-orchestrator.dev/voice/) presents Studio, both
libraries, AI writing research and HTML guides. It exposes no text-analysis form, prompt-generation playground, LLM tools
or model endpoint. English pages are served under `/voice/`; German pages under
`/voice/de/`. All eighteen guides have complete German prose. Code examples,
API identifiers and source quotations retain their original form. Language links
and page content work without JavaScript.

The static build targets the ecosystem's `/voice/` path. The
[website and deployment guide](website/README.md) describes its output and
publication configuration. The local Studio application runs separately.

To review the Voice website itself, keep Studio and the website preview running,
then run `npm run onboard:website`. This registers the original JSON and Markdown
sources selected in [voice.config.json](voice.config.json), including the HTML
guides' Markdown sources.

## Repository and maintained files

[agent-orc/voice-lint](https://github.com/agent-orc/voice-lint) contains the complete
product at its repository root: Studio, both libraries, website, benchmarks,
concept and **VL-W1 dossier**. Product changes and releases belong to this
repository. The `main` branch holds source; `deploy` holds the generated public
website snapshot. [Dossier synchronization](docs/integrations/voice-lint/README.md)
updates the maintained product section in the same checkout.

| Path | Maintained content |
| --- | --- |
| `frontend/`, `backend/` | Studio UI, source adapters, persistence and Runner integration |
| `packages/writing-rules/`, `packages/review/` | Tooling and HTML libraries |
| `packages/contracts/`, `knowledge/` | Shared transport types and Studio's local rules |
| `website/` | Static product website, research records and HTML guide renderer |
| `docs/`, `benchmarks/` | References, review records and reproducible evaluation methods |
| `docs/operations/voice-concept-revision/` | VL-W1 dossier and its lifecycle metadata |
| `examples/`, `scripts/` | Example projects and supported local commands |

See [file ownership and retention](docs/maintaining.md) for generated builds,
private runtime state and dated evidence.

## Build and verify

```sh
npm ci
npm run build
npm run test:library
npm run test:writing-rules
npm run test:library-types
npm run test:backend
npm run test:writing-review-quality
```

A fresh HTTPS clone of source `68f224d` passed dependency installation, the full
product build, the static website build and strict artifact validation on
13 September 2026 with Node.js 24.18.0 and .NET SDK 10.0.301. Dependencies were
restored through npm and NuGet; no local project dependencies, private session
files or sibling checkouts were copied into the clone. The
[repository audit](docs/reviews/voice-repository-2026-09-13.md) records the exact
revision and scope. Later source changes need their own build verification.

The current browser layout suite has **120 checks** for full/compact/focus modes,
desktop/mobile panes, touch, keyboard controls, persistence and accessible header
controls. Browser scenarios require installed Chrome and their documented local
fixture servers. See the [command catalogue](scripts/README.md),
[layout checks](scripts/verify-split-layout.mjs) and
[verification records](docs/verification.md) for scope and prerequisites.

The [13 September bilingual release record](docs/verification/2026-09-13-bilingual-release/README.md) includes the fresh-clone build, byte-for-byte reproduction and public browser/SEO verification.
