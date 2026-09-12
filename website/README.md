# Voice website

Voice publishes six product pages and eighteen HTML guides at `/voice/`. Product pages, Research summaries and navigation support English and German. Guide prose is English; bibliographic titles keep their original language.

The homepage presents Studio alongside two packages: `@voice/writing-rules` for rule knowledge and host-side tooling, and `@voice/review` for HTML annotations. Research connects each source to current API use and capabilities proposed for a later release.

| Route | Content |
| --- | --- |
| `/voice/` | Studio, the two libraries and Git-backed source/review files |
| `/voice/studio/` | Local startup and three recorded Studio views |
| `/voice/library/` | Tooling integration, HTML annotations and a supplied example finding |
| `/voice/research/` | Practice articles, studies, strategies, libraries and review benchmarks |
| `/voice/writing-patterns/` | Twenty writing patterns, examples, counter-prompts and API references |
| `/voice/docs/` | Technical guide entry points |
| `/voice/guides/{slug}/` | The eighteen entries in the [guide catalogue](guides.mjs) |

Studio and Library form the tool group in the header. Research, AI anti-patterns and Docs form the resource group. `/voice/project-reviews/` redirects to the homepage and is excluded from the sitemap.

## Build and preview

Run from the root of the [Voice Lint repository](https://github.com/agent-orc/voice-lint):

```sh
npm run website:build
```

This builds both JavaScript packages and writes the static site to `website/dist/voice/`. The website requires no .NET backend.

To build and open a local preview:

```sh
npm run website:preview
# http://127.0.0.1:5187/voice/
```

The preview server binds to loopback port 5187 and serves GET/HEAD requests from `website/dist/`. Local Studio runs separately on port 5188.

## Published content

[build.mjs](build.mjs) selects every publication input explicitly. [guides.mjs](guides.mjs) lists guide sources and source downloads. Research records come from `website/research/`, including German records in `website/research/de/`; writing patterns come from the package's versioned catalogue.

```text
website/dist/voice/
  index.html
  studio/  library/  research/  writing-patterns/  docs/
  guides/<slug>/index.html
  assets/                         Studio screenshots and capture records
  sources/research/               Research JSON, including de/
  sources/writing-rules/          Rule catalogue
  sources/examples/               Current storage examples
  sources/repository/             Explicit source downloads
  sources/verification*/          Curated, dated evidence
  sources/<slug>.md               Guide source downloads
  voice-review.js                 HTML annotation library
  build-info.json
  sitemap.xml
```

The builder verifies the byte lengths and SHA-256 hashes of curated evidence before copying it. Inputs must resolve inside the source tree without symlinks. It stages a complete site under `.local/`, then replaces `website/dist/voice/` as a whole, so obsolete output files cannot remain in the published subtree.

`build-info.json` records the build time, Git commit and branch, relative source path, scoped dirty state, 24 content routes and SHA-256 hashes of publication inputs. Its `published: false` value describes a local build. Successful hosting must be verified separately.

Internal plans, local session state, backend binaries, uncurated test results and credentials are outside the publication inputs. The screenshot files in `website/assets/` have adjacent `.capture.json` records describing their capture scope.

## Browser behavior

The public site provides navigation, language selection, catalogue filters, code copying and formatted JSON dialogs. The HTML-library example renders a supplied finding and demonstrates text selection and annotations.

There is no executable text checker, prompt composer, LLM tool dispatcher, provider connection or model endpoint on the public website. Tooling examples document integration in a host application. Guide downloads and research JSON contain reference material.

On a loopback preview only, `?voice-studio=1` enables the HTML review bridge to local Studio. This branch is disabled on `agent-orchestrator.dev`. The hosted site does not receive a Studio session or backend credentials.

JSON links open formatted dialogs with keyboard navigation and loading/error states. With JavaScript disabled, they remain ordinary links. Technical guides are HTML; their Markdown sources are available in a collapsed download section.

## Verify

Validate a release build before publication:

```sh
npm run website:verify-artifact
```

The validator derives the file inventory from the product/guide catalogues and evidence manifests. It checks source and copied-file hashes, routes, sitemap, canonical URLs, approved browser scripts and the exclusion of private runtime files and executable writing tools. The build must match current Git HEAD, with clean Voice sources both when built and when checked.

For local preparation only, `npm run website:verify-artifact -- --allow-dirty` permits dirty source state. It still requires matching HEAD, unchanged build inputs and a valid artifact; CI rejects this option.

With the website preview running:

```sh
npm run test:website
npm run test:research
npm run test:writing-patterns
```

Independent checks:

```sh
npm run test:json-viewer
npm run test:evidence
```

Browser checks cover desktop/mobile routes, English/German content, assets, fragments, code copying, no-JavaScript content, supplied HTML annotations and the absence of executable writing tools. JSON-dialog tests use an isolated fixture. Evidence checks validate the retained manifests without rerunning historical tests.

Reports and screenshots are written to ignored `test-results/`. [Verification records](../docs/verification.md) identify retained evidence by date and build-input hashes.

## Ecosystem hosting

Target: `https://agent-orchestrator.dev/voice/`. The first public release is pending. Publishing is a manual release step.

| Role | Configuration |
| --- | --- |
| Source | [`agent-orc/voice-lint`](https://github.com/agent-orc/voice-lint), branch `main`, repository root |
| Static artifact | Branch `deploy` in the same repository; only the contents of `website/dist/voice/` |
| Central hosting | [`agent-orc/website`](https://github.com/agent-orc/website) |
| Server mount | Caddy serves `/voice/*` from `/srv/sites/voice/current` |
| Server update | The central updater polls the artifact branch every five minutes and switches the current release by symlink |

[deployment-manifest.json](deployment-manifest.json) records the target, source, artifact branch, mount and route list. `website:build` and `website:verify-artifact` perform no remote publication.

Build and validate the intended committed `main` source from the repository root, then publish only the contents of `website/dist/voice/` at the root of `deploy`. Preserve its directory structure and the other ecosystem products. The local Studio backend is not part of this artifact.

After the server has updated, compare its public files with the exact local artifact:

```sh
npm run website:verify-deployment
```

This verifies file bytes, content types, all content routes, the `/voice` redirect, missing/private-route 404s and the ecosystem homepage link. It writes the public verification record under ignored `test-results/voice-deployment/`.

Check public browser behavior with the fixed deployment target:

```sh
VOICE_WEBSITE_URL=https://agent-orchestrator.dev/voice/ npm run test:website
VOICE_WEBSITE_URL=https://agent-orchestrator.dev/voice/ npm run test:research
VOICE_WEBSITE_URL=https://agent-orchestrator.dev/voice/ npm run test:writing-patterns
```

These browser checks allow the configured public target and keep its reports separate from local preview reports. They exercise static pages and the supplied annotation example; no Studio session or model access is used.
