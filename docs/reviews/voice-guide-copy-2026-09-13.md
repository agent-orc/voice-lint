# Voice guide copy review — 13 September 2026

Four groups of contextual copy issues were corrected across 14 source files. The local Voice scanner returned nine candidates before and after the edits; contextual inspection retained all nine as instructional examples or explicitly negated guarantees. These counts describe this review, not a writing-quality score.

[Complete review record, source snapshots and hashes](voice-guide-copy-2026-09-13.json)

## Scope and method

- Read all 18 published guide sources in English and their 18 German translations, including headings, tables and the context of code/examples. Also inspected the English publication catalogue and both German title/description catalogues.
- Focused on unexplained approval modifiers, hedged Git-storage headings, rhetorical or promotional headings, implementation history in current instructions, vague benefits and model-quality claims without measurements. Cross-guide German reader address was an additional consistency check.
- Called the actual `findWritingSignals` from the built `@voice/writing-rules` package on every complete Markdown string, with its locale and `maxSignals: 500`. Omitting profile and rule IDs selects all 20 rules. Catalogue version: `voice-writing-rules/0.2.2`.
- Eight rules have static patterns; twelve have none. No scan was truncated. Code, quotations and negation were not masked: they are part of the published input and expose the scanner’s limits.
- Recorded a before snapshot, applied the approved edits, then captured and scanned the same 36 sources again. The JSON retains 50 distinct UTF-8 source snapshots, exact hashes, UTF-16 spans, coverage and both sets of results. Unchanged inputs share a snapshot.
- This contextual assessment was authored by the coding agent in the same development session. It is not an independent human benchmark or certification. No Voice model execution, provider request, browser operation or new source-runtime test was used.

Base commit at capture: `33063b5141123d9c17108e74c369b9b408db5aa3`. Both stages include working-copy content; that commit alone cannot reproduce them. The retained text snapshots can. Final source hashes were stable throughout capture.

## Corrections

| Finding | Original text and location | Correction | Disposition |
| --- | --- | --- |
| Present function | `docs/workflow.md:137`: “The original source backup/recovery journal remains in use.” German counterpart: `website/guides/de/workflow.md:90`. | State that the backend backs up the source and records the pending write before applying a proposal. `ProjectStore.ApplyProposal` and `RecoverTransactions` were inspected to check that wording. | Implemented in EN/DE |
| Reader address | `website/guides/de/live-bridge.md:18`: “Für einfaches HTML stellen Sie …”; the workflow already says “Starte die Anwendung …”. | Use du throughout the nine translations that used Sie. Keep object pronouns and code intact. | Implemented in nine DE guides |
| Repeated instruction | `docs/maintaining.md:53`: “Document explicit inputs, side effects, output locations and failure behavior. Document it in the command catalogue.” | “Document each command's inputs, side effects, output locations and failure behavior in the command catalogue.” | Implemented; DE already combined these instructions |
| Unexplained modifier | `docs/writing-rules.md:17`: “justified uncertainty”; DE: “sachlich begründete Unsicherheit”. | Name the criterion: uncertainty caused by missing or conflicting evidence. | Implemented in EN/DE |

Locations above refer to the before snapshot. The JSON records exact before/after quotes, offsets and source hashes. All four groups are resolved in the captured after state. No additional rhetorical/promotional heading, hedged Git-storage heading or unsupported model-quality claim was identified within this focused review. That is an observation about this scope, not a guarantee that no other writing issue exists.

## Text retained after contextual inspection

- The three `powerful` matches occur in code that deliberately demonstrates the scanner. Editing them would remove the example input.
- The other six candidates explicitly deny a guarantee about model output, sandboxing or token/cost caps. Matching the word does not establish a positive unsupported claim.
- “Decision justified” stays in the benchmark: the adjoining rubric defines the judgment and requires written reasons, preserved facts/intent and inspection of every alternative.
- The live-bridge body recommends explicit IDs and then explains the exact-text fallback and its limitations. This is a supported choice, not a hedged Git-storage heading.
- The old dossier introduction stays as an explicitly labeled instructional counterexample: it shows why zero static findings can miss the reader’s problem.
- Dated verification headings and licensing dates stay. They distinguish retained observations from the current service and prevent historic evidence from becoming a present quality claim. Original bibliographic wording and technical identifiers were not treated as promotional prose.

## Verification of this record

- 72 actual document-scanner calls: 36 before and 36 after. Nine candidates in each stage; zero confirmed static defects after inspecting each candidate.
- 18 EN/DE pairs retain the same heading levels/order, 94 exact code blocks across both languages and unchanged Markdown link targets. There are 220 prose headings across the 36 documents.
- Every retained snapshot hash, signal quote/span and contextual finding anchor is validated. Current guide files match the captured after hashes at final verification.
- Build, rendered-page, accessibility, SEO and resolved-link checks belong to the separate release verification. They were not rerun or certified by this copy audit.

## Replay the retained static inputs

Use the recorded catalogue/code revision. A newer rule implementation may intentionally produce different results; record that as a new run instead of replacing this record. From the repository root:

```sh
npm ci
npm run build:writing-rules
node --input-type=module <<'JS'
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { findWritingSignals } from './packages/writing-rules/dist/index.js';
const report = JSON.parse(fs.readFileSync('docs/reviews/voice-guide-copy-2026-09-13.json', 'utf8'));
let calls = 0;
for (const document of report.documents) for (const stage of ['before', 'after']) {
  const saved = document[stage];
  const text = report.inputSnapshots[saved.sha256].text;
  assert.equal(crypto.createHash('sha256').update(text, 'utf8').digest('hex'), saved.sha256);
  const expected = { ...saved.scan, signals: saved.scan.signals.map(({ line, context, ...signal }) => signal) };
  assert.deepEqual(findWritingSignals(text, { language: document.language, maxSignals: 500 }), expected);
  calls++;
}
console.log(`${calls} retained scanner results reproduced.`);
JS
```

Replaying static results does not reproduce an independent editorial judgment. The JSON retains the reasons for the contextual decisions so another reviewer can challenge them. No authorship probability, model winner, token-cost result or production-readiness certification follows from this audit.
