# Voice repository migration — 12 September 2026

Internal operation record for VL-W1. This file records repository provenance and
the completed local/runtime handoff and release status; it is not a public product guide.

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
| Published standalone source on `main` | [d491e5b](https://github.com/agent-orc/voice-lint/commit/d491e5b) |

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
`main`. The reviewed source was pushed successfully to
[agent-orc/voice-lint main at d491e5b](https://github.com/agent-orc/voice-lint/commit/d491e5b),
advancing the remote from 2bcc58d.

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

Source [f7980be](https://github.com/agent-orc/voice-lint/commit/f7980be) is published on main. Strict artifact validation
without --allow-dirty passed from that clean committed source: 99 files,
24 routes plus the redirect and 87 input hashes.
Artifact SHA-256: be976b841ee6b9001d948c4595804818373969aac725bc656e35c45fa23e7c5f.

Static release [f6286e6](https://github.com/agent-orc/voice-lint/commit/f6286e6136a7cdb5b6903c22065e9eae8f344b2d)
was pushed to agent-orc/voice-lint deploy. It contains the 99 static website files,
without the Studio application or backend. The artifact is published in the
correct product repository.

The public /voice/ mount still returns HTTP 404. Shared routing and ecosystem
changes are prepared; the user decision on the shared-repository exception
remains open. Public reachability and verification are still outstanding.

Local cleanup is complete. The old active Devspace product directory no longer
exists. The published Devspace tree and history remain unchanged; all new Voice
commits belong in Voice Lint. The only active product root is
C:/Projects/voice-lint, with no submodule link.

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
- Final post-move website checks passed 96 route/language/viewport views and 322 links, assets and fragments. Research passed 16 checks for 30 sources; writing patterns passed 22 checks. The small writing-pattern test-origin fix is included in published source d491e5b. These were local browser checks, not public-deployment verification.

## Completed local Devspace cleanup

- Devspace main is back at published baseline 2b235abbe7de435acf84b38ac7dc589d365b07f0.
- The two unpublished Voice commits are retained at local backup ref
  refs/backup/voice-standalone-20260912-71f0d92, pointing to
  71f0d92f55f1003f784e36172b3f61c57b307bff. The standalone f19c7dc ancestry was
  checked before cleanup.
- Non-cone sparse-checkout patterns /* and !/voice-studio/ exclude the old product
  path from the local Devspace checkout. They do not remove it from the published
  remote tree or create a submodule.
- All 24,623 inventoried remaining files were moved unchanged by checked rename
  to C:/Projects/voice-lint/.local/repository-migration/devspace-runtime. The old
  voice-studio directory no longer exists.
- The final cleanup run preserved unrelated working-tree status, unrelated index
  entries, submodule HEADs and the remaining inventory exactly. No Devspace commit
  or push and no submodule change was made.
- The private audit is retained at
  .local/repository-migration/cleanup-audit-2026-09-12T20-32-06.125Z/report.json,
  with before/after status, index/configuration backups and the file inventory.
  Its contents are not published as website evidence.

## Registry path normalization after restart

The migrated registry stored absolute roots with forward slashes; example
registration compared them with native Windows paths and added two duplicate
built-in examples on restart. The private repair removed exactly those two
identical built-in duplicates and preserved all six original IDs and their data.

ProjectStore now canonicalizes loaded absolute roots with GetFullPath and
TrimEndingDirectorySeparator before example and registration comparisons. It
rejects relative or partially qualified stored roots, does not automatically
merge different IDs, and does not rewrite the registry merely to normalize paths.
After restart, both the project API and registry file contain exactly six unique
projects. The backend suite passed 146 assertions, including 40 regressions for
separator variants, trailing separators, restart and registration idempotence,
unchanged source/metadata/registry bytes, distinct IDs and invalid relative roots.

## Public deployment completed

The owner approved the central-repository exception. Integration commit eeee6eff3d2cd7b6a6ddfbfe14f8a9c0d7b5e339 is published in agent-orc/website; product source and static artifacts remain in agent-orc/voice-lint.

The website is live at https://agent-orchestrator.dev/voice/. Clean source 7360a67e255656d4a3d38f04afa2e7db377409ec produced static artifact 12fabf4ec02d504ce7502d2c8b7eb40e1fe19d71; strict validation passed 99 files, 24 content routes plus the redirect and 87 input hashes. HTTPS verification at 2026-09-12T21:57:43.793Z compared all 99 file hashes and content types, checked 24 HTML routes, the 308 redirect, private/unknown-route 404s and the ecosystem link. Five sibling sites and the unrelated hosted application retained byte-identical public HTML. The existing Caddy configuration was backed up before its validated replacement and reload.

The [retained public deployment record](../verification/2026-09-12-public-deployment/README.md) identifies this release and its scope. Earlier pending/404 observations above remain historical. No Studio backend or model capability was deployed.

## Fresh-clone audit and remote retirement — 13 September 2026

A fresh HTTPS clone of canonical source
[33063b5141123d9c17108e74c369b9b408db5aa3](https://github.com/agent-orc/voice-lint/commit/33063b5141123d9c17108e74c369b9b408db5aa3)
passed `npm ci`, `npm run build`, `npm run website:build` and strict
`npm run website:verify-artifact` on Node.js 24.18.0 and .NET SDK 10.0.301.
The check completed at 2026-09-13T06:56:21.338Z with clean Git status. It used
normal npm/NuGet dependency installation and restore, without copying installed
project dependencies, generated product files, private state or sibling source
checkouts from the active installation. This is revision-specific evidence;
later language and SEO changes require their own clean committed build.

The remaining remote Devspace copy was retired after the owner asked for the old
repository to be cleaned up. A separate clone of
RobertMischke/agent-taskboard-devspace, without submodule initialization, produced
normal commit
[53188edb930d1fd8c81e32e9a83573cfd55cdc80](https://github.com/RobertMischke/agent-taskboard-devspace/commit/53188edb930d1fd8c81e32e9a83573cfd55cdc80).
It advances main from 2b235abbe7de435acf84b38ac7dc589d365b07f0, removes exactly
299 tracked files under voice-studio/ and adds only VOICE-MOVED.md with the
canonical source and build-instruction links. All 227 other tree entries and
modes were checked unchanged. The pushed remote SHA was verified at
2026-09-13T07:07:46.432Z. No history was rewritten and no Voice implementation
was added to the old repository.

The active local Devspace remains deliberately at its recorded 2b235ab baseline.
Its unrelated working-tree edits, index, sibling projects, backup ref and private
runtime archive were not touched by this remote operation. The earlier sparse
exclusion still leaves no active voice-studio directory there. Updating that
busy checkout is separate from retiring the remote copy. The isolated retirement
clone is private maintenance evidence, not a second active product root.

The compact private reports are .local/clean-clone-report.json and
.local/old-repository-retirement-report.json in the canonical checkout. The
[13 September repository audit](../reviews/voice-repository-2026-09-13.md)
records their revision, command scope and limitations. Earlier statements above
that the old remote was unchanged describe the 12 September local handoff; the
13 September retirement supersedes that remote state while preserving history.
