# Voice Lint concept revision (VL-W1)

Status: 2026-09-03, decision-ready. Entry point: `index.html`.

## Question

The Quality Studio website copy (live since 2026-09-01) reads inflated to the operator: slogan headings,
antitheses, absolutes, a status paragraph with an over-precise non-fact and a self-attestation. The
canonical style guide and fifteen runtime prompts already demand a sober voice. What does the voice
consist of, how can it be measured, how can it be enforced through profile, prompts, gates and review,
and what does a Voice Studio look like?

## Findings

- The page fails on structure, not vocabulary. Zero intensifiers from any published list; 10 of 10
  section headings end with a period, 6 are verbless; "never" 11 times in 1,221 words; 16 em dashes;
  4 antitheses. Findings per 1,000 words: 62 (page) vs 25 (voice-lint README).
- Prompt-level enforcement existed and did not hold. Detection must run on the text.
- Voice Lint's contracts are sound (spans, no scalar gate, DE/EN, Vale + native metrics). Missing:
  a structure rule family, a claims dimension with a facts registry, text classes with per-class bands.

## Proposals

- Twelve rules R1 to R12 (heading form, fragments, length, claim budget, claim backing, evaluation words,
  metaphor, pivots, self-reference, time-bound words, specificity, German).
- Metric catalogue per text class; provisional bands; status per dimension; scores null until calibrated.
- Four enforcement layers: repository profile + `facts.yml`; generated prompt block; pre-commit, CI,
  Agent Studio gate step, MCP self-check; Voice Studio for review and calibration.
- Voice Studio as `apps/voice-studio` in this repository, mirroring Quality Studio (sidecars with hash,
  runs with caps, three panes, finding lifecycle, handover), slices S0 to S5.
- Concept revision: milestones reordered to deliver the gate before adapters; provider adapters and
  AI-origin signal deferred.

## Programme

Fourteen cards in four phases (QSW-a copy fix, VL-1 first commit, VL-2 to VL-6 offline core, VL-7, VL-8,
AGT-a, AGT-b claims and gates, VL-9 to VL-11 API and Studio, VL-12 calibration). Six decisions D1 to D6.

## Evidence in this folder

- `measure.py`: extraction of i18n copy and the heuristic pattern catalogue used in §2.
- `measurements.md`: raw output for the four corpora.
