# Public product copy review · 13 September 2026

The review found wording and current-state errors in both languages. A clean local pattern scan would not have found them. The changes below address those errors; this record does not certify every English or German sentence.

## Scope and method

The six product routes—home, Studio, Library, writing patterns, research and the documentation index—were rendered from `website/site.mjs` in English and German. `findWritingSignals` from `@voice/writing-rules` scanned each body after code blocks and controls were removed. Inline examples and closed research/rule disclosures remained included. Each call used `maxSignals: 500`; none was truncated.

The coding agent separately reviewed introductions, headings, instructions, examples, API boundaries and selected evaluative wording in the research records against the reader task and current implementation. This was not an external model run or an independent human quality benchmark. [The JSON record](voice-public-copy-2026-09-13.json) retains source/text hashes, coverage, candidate context and decisions.

| Route | EN candidates | DE candidates | Contextual result |
| --- | ---: | ---: | --- |
| Home | 0 | 0 | Removed repeated preview and screenshot assertions. |
| Studio | 0 | 0 | Fixed the repository directory and the outdated review-overlay description. |
| Library | 0 | 0 | Named the HTML demo and described prompts as instructions, rather than an executing reviewer. |
| Writing patterns | 18 | 2 | Replaced the hero's unexplained evaluation; kept the teaching examples. |
| Research | 3 | 1 | Removed an unmeasured model-quality comparison and clarified the exception criterion in one source application. |
| Documentation index | 0 | 0 | Flagged the English-only guide notice for the translation work. |

All 24 scanner candidates were retained: they occur in examples, quoted cues or explanations of limitations. Counts did not decrease after editing. Eight of the 20 rules have lexical patterns; 12 require contextual review. Zero candidates on Studio did not detect either factual error. The German pass also does not check English cues within the explicitly English evidence disclosures.

## Changes and retained distinctions

| Before | Change | Rule or reason |
| --- | --- | --- |
| “berechtigten Ausnahmen” / “valid exceptions” in the pattern hero | Explain that each rule gives cases where text should stay and criteria for the decision. | `claims-evidence`, `word-choice`: the adjective adds a judgment without helping the reader apply it. |
| The same exception wording in the Slopt research application | Name cases where the original already serves the reader task. | Preserve the condition instead of merely calling the exception legitimate. |
| `cd voice-studio` | `cd voice-lint` in both Studio examples. | `current-state`: use the standalone repository's clone directory. |
| Navigation and review “open as overlays” | Navigation can overlay the page; review occupies an adjacent area with a draggable splitter in every mode. | `current-state`: match the implemented layout. |
| “stronger reference” / “leistungsfähigeren Referenz” before any model-quality results | “Model candidates and token prices” / “Modellkandidaten und Tokenpreise”. Include Astra in the same comparison. | `claims-evidence`: provider tier does not establish measured Voice review quality. |
| Repeated “actual”/“echte” screenshots and supervised-preview statements | Name the screenshot subject and the action: inspect a proposal before applying it. | `repetition`, `reader-goal`. |
| “Die echte Library ausprobieren” | “Die HTML-Library ausprobieren”. | `concrete-subject`: identify which of the two packages the demo uses. |

The screenshot says **Ausnahmen**, not Annahmen. “Berechtigt” is not inherently a defect. A named criterion can justify an evaluation; a technical term such as “valid JSON” can express a required property. Conditions, measured limitations, accepted positioning and intentional examples remain in the copy. Bibliographic titles and reported study results were not rewritten for style.

## Library change and evidence

Catalogue **0.2.2** extends the existing `claims-evidence` prompt in EN/DE. It asks for the criterion behind evaluative modifiers, gives the exception example, and preserves the technical meaning of valid JSON while distinguishing syntax from schema validation. There is no new lexical detector, rule ID or schema. Existing benchmark records remain pinned to their original version because prompt wording changed.

This is an editorial application of Microsoft's guidance to prefer precise wording and remove additions that contribute no information. It is not a study of this German expression. [Microsoft Style Guide, checked 13 September 2026](https://learn.microsoft.com/en-us/style-guide/word-choice/use-simple-words-concise-sentences).

Shaib et al. assess relevance, information density, structure and other contextual qualities; their news/QA annotations also show why a global label is a weak substitute for a cited passage and reason. That supports the review method, but does not establish German coverage or the effectiveness of these Voice prompts. [Measuring AI “Slop” in Text, v2, sections 3–6, checked 13 September 2026](https://arxiv.org/html/2509.19163v2).

`npm run test:writing-rules` passed **33 tests**, including prompt propagation in both languages and cases ensuring the modifier is not turned into a lexical verdict.

## Reproduce and remaining coverage

After `npm ci` and `npm run build:writing-rules`, import `pages` from `website/site.mjs`, `JSDOM` from `jsdom`, and `findWritingSignals` from the package's `dist/index.js`. For each `page[language]`, remove `pre,script,style,button,[data-pattern-filters]`, normalize `body.textContent` whitespace and call `findWritingSignals(text, {language, maxSignals: 500})`. Hash the normalized UTF-8 text with SHA-256 and compare with the JSON record. These offsets refer to that normalized text, not the source file or a browser selection.

Guide translation, shared navigation, metadata, live layout and deployment are separate checks. This review did not revalidate every research paper, price or translation, and there is no independent bilingual editorial sign-off or measured model-effectiveness result. Keep those limits visible when reporting completion.
