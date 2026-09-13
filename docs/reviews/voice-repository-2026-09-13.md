# Voice repository and fresh-clone audit — 13 September 2026

This internal record answers whether the standalone repository contains the source
needed to build Voice and whether the old Devspace product copy has been retired.
It is separate from public website release verification and editorial review.

## Canonical repository

[agent-orc/voice-lint](https://github.com/agent-orc/voice-lint) owns Studio, both
libraries, the static website, research, benchmarks and VL-W1 at its repository
root. `main` contains source; `deploy` contains the generated public website.
The active local product directory is `C:/Projects/voice-lint`. No sibling
Devspace or external Runner source checkout is required for the product build.

The central repository [agent-orc/website](https://github.com/agent-orc/website)
owns ecosystem navigation and hosting configuration. It consumes the Voice
artifact and does not own Voice product source.

## Fresh HTTPS clone

Source revision:
[33063b5141123d9c17108e74c369b9b408db5aa3](https://github.com/agent-orc/voice-lint/commit/33063b5141123d9c17108e74c369b9b408db5aa3).

The check ran from **2026-09-13T06:54:55.744Z** to
**2026-09-13T06:56:21.338Z**, with **Node.js 24.18.0** and **.NET SDK 10.0.301**.
It cloned the HTTPS remote into an isolated local directory and ran:

| Phase | Result | Scope |
| --- | --- | --- |
| Fresh HTTPS clone | Exit 0 | Repository source retrieved from GitHub |
| `npm ci` | Exit 0 | Dependencies installed from the committed lockfile |
| `npm run build` | Exit 0 | Both JavaScript libraries, Angular frontend and .NET backend built |
| `npm run website:build` | Exit 0 | Static website built from the cloned publication inputs |
| `npm run website:verify-artifact` | Exit 0 | Strict validation of the clean committed artifact, without `--allow-dirty` |

Git status was empty after the checks. No installed dependencies, generated
product files, private sessions, project registry or sibling checkout were copied
from the active installation. npm and NuGet resolved dependencies through their
normal installation and restore mechanisms. Normal package caches may be reused;
this was not an empty-cache or offline build test. The required Node, .NET and
Bash installations were already present on the host.

The private machine report is `.local/clean-clone-report.json`. The retained
values above identify the checked source and outcome without publishing private
session state or temporary host paths.

This proves build completeness for the recorded revision. It does not prove
current CLI authentication, model-review quality, live Studio behavior or the
public deployment of a later source revision. Optional review of the Agent Studio
pilot still needs that application's explicitly supplied source directory and
running development server.

## Old remote product copy retired

The old remote `RobertMischke/agent-taskboard-devspace` still contained 299 tracked
files under `voice-studio/` at the start of this audit. A separate clone, without
submodule initialization, was used for the retirement operation.

| Item | Recorded result |
| --- | --- |
| Before | `2b235abbe7de435acf84b38ac7dc589d365b07f0` |
| After | [53188edb930d1fd8c81e32e9a83573cfd55cdc80](https://github.com/RobertMischke/agent-taskboard-devspace/commit/53188edb930d1fd8c81e32e9a83573cfd55cdc80) |
| Removed | Exactly 299 tracked `voice-studio/` files |
| Added | Only `VOICE-MOVED.md`, linking to the standalone repository and its build instructions |
| Preserved | All 227 other tree entries, including their content and Git modes |
| Remote verification | `refs/heads/main` matched the retirement commit after the push |
| Completed | `2026-09-13T07:07:46.432Z` |

The retirement is a normal single-parent commit and ordinary push. It does not
rewrite history; earlier Devspace commits retain the former source. No new Voice
implementation was committed to Devspace. The compact machine record remains at
`.local/old-repository-retirement-report.json` in the canonical checkout.

The active local Devspace was deliberately left at the recorded
`2b235abbe7de435acf84b38ac7dc589d365b07f0` baseline with its unrelated edits,
index and sibling projects intact. It was not pulled or reset during this remote
cleanup. Its sparse checkout excludes `voice-studio/`, and that former active
directory remains absent. The earlier local backup ref and private runtime
archive remain preserved as described in the
[migration record](../operations/repository-migration-2026-09-12.md). Those
backups and the isolated retirement clone are not active Voice product roots.

## Later language and release changes

The source changes under review add 24 static English routes under `/voice/`
and 24 German routes under `/voice/de/`, including full German prose for all
18 guides. Code examples and heading anchors remain aligned with English.
Language-specific HTML, canonical URLs and `hreflang` links make the language
variants accessible without JavaScript. Translation maintenance is documented in
the [website README](../../website/README.md#maintain-guide-translations).

These later changes are outside the fresh-clone result for `33063b5`. Record a
new final source revision and repeat the clean build and strict artifact checks
after committing them. Public HTTP and browser verification must then identify
the artifact actually served; a successful local build alone does not establish
that the current public website contains those changes.
