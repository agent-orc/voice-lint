# Voice Studio command catalogue

Run these commands from the Voice Studio workspace. Node.js, Bash and .NET
requirements are in the [main README](../README.md).

| Command | Purpose and prerequisites | Writes / output |
| --- | --- | --- |
| `npm start` | Build and start the local Studio and example website | Generated builds and private local session state |
| `npm run pairing-code` | Recover the running installation's local pairing code | Prints the pairing code, never the bearer token |
| `npm run build` | Build both libraries, Angular frontend and .NET backend | `dist/`, `bin/`, `obj/` |
| `npm run build:frontend:staged` | Build frontend without replacing currently served assets | `frontend/dist/voice-studio-next/` |
| `npm run frontend:publish-local` | Copy an already completed staged frontend, entry point last | Replaces the local served frontend; no backend restart or remote publication |
| `npm run website:build` | Build bilingual product pages, the library demo and styled HTML technical guides | `website/dist/voice/`; no deployment |
| `npm run website:preview` | Build and serve the public-site preview on loopback 5187 | Same static output and a local process |
| `npm run website:verify-artifact` | Validate the static publication inventory, source hashes, Git revision, routes and public browser boundaries; requires a clean committed build | Read-only; `-- --allow-dirty` is limited to local preparation |
| `npm run website:verify-deployment` | Compare the fixed public Voice target with the exact local artifact; verify routes, content types and hosting boundaries | Read-only public requests; report under `test-results/voice-deployment/` |
| `npm run test:source-provenance -- --help` | Configurable source/hash/Git and optional task-provenance verification for a running local Studio | Compact report under ignored `test-results/`; no source-write/model request |
| `npm run docs:dossier:check -- --repository .` | Compare the maintained VL-W1 section with the dossier in this checkout | No writes; nonzero exit when synchronization is needed |
| `npm run docs:dossier:sync -- --repository .` | Synchronize maintained dossier content/presentation while preserving lifecycle fields | Explicit writes to this checkout’s dossier files; no Git operation |
| `npm run test:dossier` | Verify the served dossier and desktop/mobile layout | `test-results/dossier-integration/`; no API mutation |
| `npm run test:evidence` | Check all curated evidence manifests, path containment and file hashes | Read-only; does not rerun historical tests |
| `npm run test:holistic-schema` | Validate the proposed JSON examples, references and hashes; reject malformed variants | Offline only; no repository/site review and no model |
| `npm run build:writing-rules` | Build the local writing catalogue, prompt composer and surface-cue API | Package ESM files, JSON and declarations under `packages/writing-rules/dist/` |
| `npm run test:writing-rules` | Check rule/source consistency, prompt boundaries, signals and typed consumers | Offline fixtures; no model call |
| `npm run test:json-viewer` | Check JSON dialogs with an isolated loopback fixture | Browser report under `test-results/voice-website/`; no Studio access |
| `npm run test:writing-patterns` | Check the published writing catalogue, EN/DE filters, examples and absence of executable writing tools | Browser report; local preview by default, or the fixed public target below |
| `npm run test:website` | Browser-check routes, EN/DE, mobile layout and the supplied HTML-annotation example | Ignored screenshots/report; local preview by default, or the fixed public target below |
| `npm run test:research` | Check bilingual Research records, source/API links and JSON dialogs | Ignored browser report; local preview by default, or the fixed public target below |
| `npm run test:library-types` | Compile isolated TS/JS consumers and check real IntelliSense completions/hover documentation | Offline package fixtures; no VS Code UI automation |
| `npm run test:session` | Backend browser trust, expiry, restart and revocation contracts | Isolated temporary session state; no live backend |
| `npm run test:session-ui` | Resume/401/race regressions in the actual UI methods | Fake HTTP only |
| `npm run test:browser-session` | Chrome close/reopen, reload, new tabs, logout and temporary sessions | Isolated browser profile and session trust; no project/source/model writes |
| `npm run test:selection-ui` | Deferred HTTP/state regressions for keep, alternatives, retries and cancellation | Fake HTTP only |
| `npm run test:selection-workflow` | Real browser source/keep/proposal workflow against its own temporary fixture | Registers and edits only its fixture, then unregisters/removes it; no model |
| `npm run test:navigation` | Language, compact/focus navigation and overlay browser scenarios | Browser-local preferences and ignored evidence; requires Studio and the configured pilot website |
| `npm run test:loading-overlay` | Check delayed loading without layout shifts; requires running Studio with `quality-website` and `markdown-handbook` projects and Chrome | Read-only project API calls and temporary test-session pairing; ignored screenshots/report under `test-results/loading-overlay/` |
| `npm run test:wiki-i18n` | Wiki translation coverage and source-quote preservation | Offline only |

Backend suites (`test:backend`, `test:runner`, `test:tasks`, `test:checks`,
`test:selection`, `test:session`) and library/UI suites verify their respective
contracts. Runner tests use fakes. Use an isolated .NET artifacts path when a
running API could otherwise lock its build files.

`session.mjs` is an internal helper that reads private session state; it is not
an evidence exporter. `publish-built-frontend.mjs` is a local deployment helper,
not the public ecosystem website deployer.

## Public website browser checks

These commands use the fixed public deployment target instead of the local preview:

```sh
VOICE_WEBSITE_URL=https://agent-orchestrator.dev/voice/ npm run test:website
VOICE_WEBSITE_URL=https://agent-orchestrator.dev/voice/ npm run test:research
VOICE_WEBSITE_URL=https://agent-orchestrator.dev/voice/ npm run test:writing-patterns
```

The allowed target is explicit. Public reports are separated from local preview reports; the checks use no Studio session and make no model requests.

## Scenario scripts

The Agent Studio website pilot requires its actual local source root. Supply
`--website PATH`; the scripts do not assume the website is beside this checkout.
`PATH` must contain the configured Angular website and its `voice.config.json`.

```sh
npm run test:live -- --website PATH
node scripts/verify-website-revision.mjs --run --website PATH
node scripts/reconcile-website-review.mjs --website PATH --dry-run
```

The first two checks require the pilot website to be running; `test:live` also
requires Studio and registers the supplied folder. Reconciliation requires the
original audit/import records and matching website root; its dry run writes only
a local plan. Applying that plan remains a separate, digest-checked operation.

Existing `pilot-*.mjs`, `import-website-review.mjs` and
`reconcile-website-review.mjs` are scenario-specific workflows with their own
source/version assumptions. Some explicitly create tasks, invoke the configured
model or apply source proposals. They are not generic smoke checks; inspect the
script and the associated [review record](../docs/reviews/) before an authorized
run. Older `verify-*.mjs` files may target a recorded German pilot interface.
The current supported entry points are listed above and in `package.json`.

See [file ownership and retention](../docs/maintaining.md) for tracked sources,
generated output and private runtime files.

## Writing-review measurements

`npm run benchmark:writing-review` builds the writing-rules package and runs
`benchmarks/writing-review/run.mjs` over the maintained EN/DE fixtures. It writes
`test-results/writing-review/report.json` and makes no provider requests.

After reviewing the result, `npm run benchmark:writing-review:retain` verifies
its input hashes and updates the website measurement summary. Rebuild the site
to display it. The retained record distinguishes bytes from tokens and local
scanner candidates from model effectiveness.
