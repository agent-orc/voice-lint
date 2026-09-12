# Voice repository migration — 12 September 2026

Internal operation record for VL-W1. This file records repository provenance and
the remaining local/runtime handoff; it is not a public product guide.

## Repository ownership

The complete product lives at the root of
[agent-orc/voice-lint](https://github.com/agent-orc/voice-lint), locally
`C:/Projects/voice-lint`. Studio, both libraries, website, benchmarks, concept and
VL-W1 belong to this standalone repository. All future Voice source commits go
to its `main` branch. The static website artifact belongs on its `deploy` branch.

The Devspace checkout is not a second Voice product repository or a required
subrepository. Other projects, including the Agent Studio website pilot, retain
their own repositories and working directories.

## Source revisions and preserved history

| Role | Revision |
| --- | --- |
| Original Voice Lint `origin/main` | [2bcc58d](https://github.com/agent-orc/voice-lint/commit/2bcc58d) |
| Local Voice Lint dossier/README update before import | `1db8a02` |
| Devspace source HEAD used for export | `71f0d92` (local; not pushed) |
| Earlier Devspace `origin/main` baseline | [2b235ab](https://github.com/RobertMischke/agent-taskboard-devspace/commit/2b235ab) |
| Exported Voice-only history tip | `f19c7dc` |
| Standalone integration merge | `12e8bdb` |

The export used `git subtree split --prefix=voice-studio` from the recorded
Devspace source. It retained seven Voice product commits and moved their file
trees from that prefix to the exported repository root. The new commits have
different IDs because their trees and ancestry changed.

| Original Devspace commit | Imported root commit | Change |
| --- | --- | --- |
| `15ef4f0` | `e6ea2b4` | Local Studio, live Angular and Markdown review |
| `6dca6bb` | `0e50652` | Source tasks, rule wiki and project checks |
| `51ae359` | `b899fb7` | Review choices, browser sessions and typed product docs |
| `3a3391b` | `df0f2ce` | Launch entries and source-delivery records |
| `2b235ab` | `093b7d2` | Researched writing rules and review economics |
| `f3f4740` | `484a9de` | Writing tools and resizable review workspace |
| `71f0d92` | `f19c7dc` | Repository documentation and ecosystem release preparation |

Merge `12e8bdb` joins the unrelated histories. Its first parent is the existing
Voice Lint update `1db8a02`; its second parent is the export `f19c7dc`. The
integration retains both histories and does not require a force push of
`main`. This record does not claim that the merged source has already been
pushed to the remote.

Original audit references, dated screenshots and evidence hashes retain their
original commit IDs and paths. They describe the inputs that were actually
reviewed. New source provenance is produced by new builds from this repository.

## Maintained paths and commands

- Run `npm start`, builds and website commands from the repository root.
- `website/deployment-manifest.json` identifies `agent-orc/voice-lint`, source
  directory `.`, source branch `main` and artifact branch `deploy`.
- Publish only the contents of `website/dist/voice/` at the artifact branch root.
  The public mount remains `https://agent-orchestrator.dev/voice/`; Studio's
  backend and private runtime state are outside the public artifact.
- The central host configuration must pull the artifact from this repository.
- The three Agent Studio pilot scripts accept an explicit `--website PATH`.
  They no longer derive a sibling website directory from the Voice checkout.
- Dossier inputs remain under `docs/integrations/voice-lint/`; their generated
  target is `docs/operations/voice-concept-revision/` in the same checkout.
  Synchronize with `npm run docs:dossier:sync -- --repository .` and compare with
  `npm run docs:dossier:check -- --repository .`.

The website builder and artifact validator derive the Git source prefix. It is
empty at this repository root. Rebuilding records the new HEAD and current
publication-input hashes; historical build records are not rewritten.

## Runtime and publication handoff

The local source integration and runtime handoff are complete. Both managed
launch entries use C:/Projects/voice-lint. The managed Studio command is
bash .local/start-studio-preserved-session.sh; this private wrapper executes
npm start with the preserved session store. The website entry runs
npm run website:preview. Studio on port 5188 passed its health
check and an authenticated project API request; the website preview on port 5187
returned HTTP 200.

All six registered project IDs were preserved, including Voice
project-57631a3eb770 and the existing Agent Studio pilot. Five internal project
roots were moved to the standalone checkout; the external AGS path is unchanged.
The existing private session store and browser enrollment were preserved.
Session tests passed 55 assertions. These are runtime migration checks, separate
from the retained earlier layout and source-adapter evidence.

Remote publication of main is still pending, and the public website has not been
deployed. The remaining release work is to publish the reviewed source, build and
validate its static artifact, publish that artifact explicitly, then verify the
actual public files and browser behavior. Removal of the superseded Devspace
product copy is a separate local cleanup step.

Pairing codes, bearer tokens, browser enrollment credentials and private runtime
records are not stored in this document or the dossier.

## Migration record verification

- All seven exported root trees exactly match the corresponding original
  Devspace voice-studio subtree trees.
- Merge parents and ancestry preserve the original Voice Lint and exported
  product histories.
- Dossier synchronization and its subsequent read-only comparison passed in the
  same repository. Identity, lifecycle fields and unrelated dossier HTML remain
  unchanged; four earlier implementation/evidence sections match their originals.
- The served VL-W1 dossier passed the existing read-only integration check at
  desktop 1440 px and mobile 390 px, with the exact maintained fragment.
- The active repository documentation migration passed 26 relative links, 60
  npm command references, six manifest checks and nine argument-only pilot cases.
  No source edits, API writes or model calls were made by those checks.
- After relocation, the real isolated Chrome session suite passed 18 checks, including close/reopen, new tabs, reload, logout, origin rejection and temporary mode.
- Local artifact validation with --allow-dirty passed 99 files, 24 content routes plus the redirect, and 87 input hashes. This validates local preparation; it does not establish committed-source publication or public hosting.
