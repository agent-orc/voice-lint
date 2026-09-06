# Measurements (2026-09-03)

Heuristic regex catalogue, uncalibrated. Produced with `measure.py`.

```
== Quality Studio website EN (en) ==
segments=86 sentences=111 words=1221
sentence length: mean=11.0 median=8 sd=10.6 max=57 share<=7w=47%
findings per 1000 words (raw count in brackets):
  antithesis_not_but        3.3  [4]
  em_dash                  13.1  [16]
  colon_pivot               8.2  [10]
  meta_commentary           0.8  [1]
  slogan_fragment           7.4  [9]
  rule_of_three            11.5  [14]
  intensifier               0.0  [0]
  puffery_noun              4.1  [5]
  absolute_claim           13.9  [17]
  future_promise            0.0  [0]
  vague_attribution         0.0  [0]
  number_or_date           12.3  [15]
  code_or_path              4.1  [5]
  NEGATIVE_TOTAL           62.2  [76]
  specificity_markers      16.4  [20]

== Quality Studio website DE (de) ==
segments=86 sentences=111 words=1094
sentence length: mean=9.9 median=7 sd=9.6 max=51 share<=7w=53%
findings per 1000 words (raw count in brackets):
  antithesis_not_but        0.0  [0]
  em_dash                  14.6  [16]
  colon_pivot               9.1  [10]
  meta_commentary           0.0  [0]
  slogan_fragment          14.6  [16]
  rule_of_three             0.0  [0]
  intensifier               0.0  [0]
  puffery_noun              1.8  [2]
  absolute_claim            0.0  [0]
  future_promise            0.0  [0]
  vague_attribution         0.0  [0]
  de_formulaic              0.0  [0]
  number_or_date           13.7  [15]
  code_or_path              4.6  [5]
  NEGATIVE_TOTAL           40.2  [44]
  specificity_markers      18.3  [20]

== Ecosystem hub page EN (en) ==
segments=25 sentences=27 words=176
sentence length: mean=6.5 median=6 sd=5.3 max=26 share<=7w=70%
findings per 1000 words (raw count in brackets):
  antithesis_not_but        0.0  [0]
  em_dash                   5.7  [1]
  colon_pivot              39.8  [7]
  meta_commentary           0.0  [0]
  slogan_fragment           5.7  [1]
  rule_of_three            11.4  [2]
  intensifier               0.0  [0]
  puffery_noun              0.0  [0]
  absolute_claim           11.4  [2]
  future_promise            0.0  [0]
  vague_attribution         0.0  [0]
  number_or_date           11.4  [2]
  code_or_path              0.0  [0]
  NEGATIVE_TOTAL           73.9  [13]
  specificity_markers      11.4  [2]

== voice-lint README (en) ==
segments=37 sentences=66 words=914
sentence length: mean=13.8 median=12.0 sd=10.9 max=65 share<=7w=29%
findings per 1000 words (raw count in brackets):
  antithesis_not_but        1.1  [1]
  em_dash                   0.0  [0]
  colon_pivot               3.3  [3]
  meta_commentary           0.0  [0]
  slogan_fragment           0.0  [0]
  rule_of_three             9.8  [9]
  intensifier               0.0  [0]
  puffery_noun              0.0  [0]
  absolute_claim            6.6  [6]
  future_promise            4.4  [4]
  vague_attribution         0.0  [0]
  number_or_date            1.1  [1]
  code_or_path              2.2  [2]
  NEGATIVE_TOTAL           25.2  [23]
  specificity_markers       3.3  [3]

== Quality Studio README (en) ==
segments=53 sentences=87 words=1404
sentence length: mean=16.1 median=13 sd=15.5 max=110 share<=7w=31%
findings per 1000 words (raw count in brackets):
  antithesis_not_but        0.7  [1]
  em_dash                  12.1  [17]
  colon_pivot               6.4  [9]
  meta_commentary           0.0  [0]
  slogan_fragment           2.8  [4]
  rule_of_three            10.0  [14]
  intensifier               2.1  [3]
  puffery_noun              5.7  [8]
  absolute_claim            3.6  [5]
  future_promise            0.7  [1]
  vague_attribution         0.0  [0]
  number_or_date            8.5  [12]
  code_or_path              0.0  [0]
  NEGATIVE_TOTAL           44.2  [62]
  specificity_markers       8.5  [12]
```

## Quality Studio website EN, segments with findings

```
-- segments with findings --

[heroEyebrow] The engineer room
    puffery_noun: ['engineer room']

[heroLede] Quality Studio runs agent reviews per level and per kind, and writes every statement as a sidecar file beside the code it judges. Agents read and grade; the repository owns the result.
    absolute_claim: ['every']

[heroStatus] · library, CLI, API, and browser ship from one repository · nothing published to NuGet yet · Apache 2.0
    rule_of_three: ['CLI, API, and browser']
    absolute_claim: ['nothing']
    number_or_date: ['2.0']

[shotEditorAlt] Quality Studio editor with review overlays: a graded C# file, findings with severities in the right panel, per-kind review-state dots in the file tree
    colon_pivot: ['s: a']

[shotEditorCaption] Captured from a running Quality Studio instance reviewing its own repository — not a mockup.
    em_dash: [' — ']

[wsTitle] A code browser, not a dashboard.
    slogan_fragment: ['A code browser, not a dashboard.']
    antithesis_not_but: [', not a dashboard.']

[wsIntro] The primary surface is a three-pane engineer view. The entry point is the code; its quality characteristics are read in place — no chart sits between the reader and the file.
    em_dash: [' — ']

[wsF1P] The derived hierarchy with one chip per review kind on every node: review state at a glance, grade on hover, filterable by state.
    colon_pivot: ['e: r']
    absolute_claim: ['every']

[wsF2P] The file itself, with review overlays rendered at the code. Switching kind or aspect changes the overlay, never the file.
    absolute_claim: ['never']

[wsF4P] A to F per unit and kind, with a written rationale. A file review is never collapsed into a single good-or-bad badge.
    absolute_claim: ['never']

[lvTitle] Independent statements.
    slogan_fragment: ['Independent statements.']

[lvIntro] A statement belongs to exactly one unit and one review kind. A project review and a file review are different statements; neither is computed from the other, and an aggregate never substitutes for a review at another level.
    absolute_claim: ['never']

[kindCode] Correctness, clarity, maintainability. Architecture is an aspect of project and module code reviews, not a fourth kind.
    slogan_fragment: ['Correctness, clarity, maintainability.']

[kindSecurity] Deterministic sensor evidence combined with agent judgment in one statement. Detachable by design: separate files, prompts, runs, and grades.
    colon_pivot: ['n: s']
    rule_of_three: ['prompts, runs, and grades']

[kindPerformance] Its own sweep and its own sidecars. Reviewing performance never refreshes code or security metadata.
    absolute_claim: ['never']

[scIntro] Every reviewed unit gets one small JSON document per kind, stored in the same feature folder as the code — <code>.quality/reviews/files/file.<hash>.review-meta.code.json</code>. Diffable, portable, and versioned like any other artifact. History is ordinary Git history; the score trend is reconstructed from commits, not from a report database.
    em_dash: [' — ']
    rule_of_three: ['Diffable, portable, and versioned']
    absolute_claim: ['Every']
    code_or_path: ['.quality/', '.review-meta.code.json']

[scStalenessIntro] Staleness is a computed view of an immutable statement. Scanning or browsing never rewrites a meta file; the content hash makes drift self-evident.
    absolute_claim: ['never']

[stStale] code changed — the statement describes an older version.
    em_dash: [' — ']

[stMissing] not reviewed. Shown as absence, never as an F.
    slogan_fragment: ['not reviewed.', 'Shown as absence, never as an F.']
    absolute_claim: ['never']

[runTitle] Sweeps with caps and a ledger.
    slogan_fragment: ['Sweeps with caps and a ledger.']

[runIntro] A run covers one scope and one kind. The browser never launches an agent process: the API queues the run, executes agent CLIs, and reports progress per file. Fresh units are skipped; a token or cost cap stops the sweep at the next operation boundary.
    colon_pivot: ['s: t']
    absolute_claim: ['never']

[shotRunAlt] A running code review in Quality Studio: per-file progress, pause and cancel, run history, and a live token usage panel
    colon_pivot: ['o: p']
    rule_of_three: ['progress, pause and cancel']

[shotRunCaption] A real run over this repository's analysis core — 61 files in progress, run history with a pinnable baseline, and the token usage that the ledger records.
    em_dash: [' — ']
    number_or_date: ['61']

[run1B] 01 · estimate
    number_or_date: ['01']

[run1P] A free preflight renders the real prompts and predicts tokens and cost against the model catalog — labeled as an estimate, not a promise.
    antithesis_not_but: [', not a promise.']
    em_dash: [' — ']

[run2B] 02 · run
    number_or_date: ['02']

[run3B] 03 · persist
    number_or_date: ['03']

[run3P] Each completed unit writes its sidecar; the run writes a canonical snapshot under <code>.quality/reports/runs/</code>.
    code_or_path: ['.quality/']

[run4B] 04 · account
    number_or_date: ['04']

[run4P] Model, tokens, duration, and run identity land in the sidecar and in an append-only monthly ledger under <code>.quality/usage/</code>.
    rule_of_three: ['tokens, duration, and run']
    code_or_path: ['.quality/']

[runModels] Model routing follows the synchronized Token Economy catalogs: capability tiers, supported thinking levels, prices, and retirement status. Provider quota is read as a presentation-safe snapshot — an empty answer means unavailable, never unlimited.
    em_dash: [' — ']
    colon_pivot: ['s: c']
    rule_of_three: ['levels, prices, and retirement']
    absolute_claim: ['never']

[chIntro] Standing metadata answers how a unit scores until its inputs change. A change review answers a different question: what one integration transition changed in that standing evidence. <code>quality diff</code> computes the deterministic delta first — grade movement, new and resolved findings by fingerprint, staleness caused, boundary changes — and only then asks an agent to judge risk, test evidence, scope discipline, and architecture drift on the diff alone.
    em_dash: [' — ', ' — ']
    colon_pivot: ['n: w']
    rule_of_three: ['movement, new and resolved', 'evidence, scope discipline, and architecture']

[chF1P] Each reviewed transition is one artifact under <code>.quality/changes/</code>, keyed by its merge commit — or by the transition's head commit when the integration has a single parent. A pure file move is recorded with no quality delta.
    em_dash: [' — ']
    code_or_path: ['.quality/']

[chF2P] The committed 20-transition sample in this repository weighed 922,304 diff characters against 3,351,261 full-sweep characters: 72.48% less evidence in aggregate, median savings 67.89% per change.
    number_or_date: ['20-', '922,304', '3,351,261', '72.48', '67.89']

[snTitle] Sensor evidence, then agent judgment.
    slogan_fragment: ['Sensor evidence, then agent judgment.']

[snIntro] Deterministic tools scan first; their results are handed to the review agent as prior facts and stored separately from its findings. The grade remains the agent's statement — analyzer evidence never caps or replaces it.
    em_dash: [' — ']
    absolute_claim: ['never']

[snF1P] <code>gitleaks</code> (pinned and checksum-verified), <code>roslyn</code>, <code>eslint</code>, <code>tsc</code>, producer-neutral SARIF, dependency audits, coverage readers, and a boundary inventory of externally callable surfaces.
    rule_of_three: ['audits, coverage readers, and a']

[snF2P] A missing tool or a failed scan is reported as an explicit unavailable state with its reason — never as a clean result, never as a pass.
    em_dash: [' — ']
    absolute_claim: ['never', 'never']

[hoTitle] Handover to Agent Studio.
    slogan_fragment: ['Handover to Agent Studio.']

[hoIntro] Quality Studio stays the engineer room. When a finding needs action, “make this a task” hands a lossless snapshot to Agent Studio through its normal task mutation path — one direction, no embedded quality dashboard in the cockpit, and a backlink for the way back.
    em_dash: [' — ']
    puffery_noun: ['engineer room']

[hoLink] The Agent Orchestrator universe: cockpit, runner, chat, accounting →
    colon_pivot: ['e: c']
    puffery_noun: ['universe']

[saIntro] Everything runs against a plain checkout. The analysis core is a packable library (nothing is published yet); the <code>quality</code> CLI drives scans, reviews, diffs, and reports; the API serves the tree, the overlays, the runs, and the usage; reports are exported as Markdown, HTML, JSON, or SARIF 2.1.0 with CI gates.
    rule_of_three: ['reviews, diffs, and reports', 'overlays, the runs, and the']
    absolute_claim: ['nothing']
    number_or_date: ['2.1.0']

[saF1P] <code>quality scan</code> fails on stale reviews, <code>quality diff --fail-on-regression</code> on deterministic regressions, <code>quality report --fail-under / --fail-on</code> on score or severity — and the report is still published before the gate fails.
    em_dash: [' — ']

[shotDashAlt] The Quality Studio project dashboard: open findings by severity, staleness, review coverage, test coverage, and an unavailable security scanner reported as unavailable
    colon_pivot: ['d: o']
    rule_of_three: ['coverage, test coverage, and an']

[shotDashCaption] The project dashboard during today's sweeps: 81 open findings by severity, 13.3% review coverage, zero stale statements — and a security posture that reads scanner unavailable instead of a clean pass.
    antithesis_not_but: ['instead of']
    em_dash: [' — ']
    absolute_claim: ['zero']
    number_or_date: ['81', '13.3']

[stIntro] Founded 2026-07-11. Core library, CLI, review API, and the Angular browser ship from one repository and are covered by CI. Open research is labeled as research: whether a code graph joins as a graphical meta layer is a time-boxed spike, not a decision. This page describes what exists.
    slogan_fragment: ['Founded 2026-07-11.']
    antithesis_not_but: [', not a decision.']
    colon_pivot: ['h: w']
    meta_commentary: ['This page describes']
    rule_of_three: ['CLI, review API, and the']
    number_or_date: ['2026-07-11']

[stLink] Repository, concept, and slice plan on GitHub ↗
    rule_of_three: ['Repository, concept, and slice']

[footerLeft] Quality Studio — the engineer room of the Agent Orchestrator universe.
    em_dash: [' — ']
    puffery_noun: ['engineer room', 'universe']
```
