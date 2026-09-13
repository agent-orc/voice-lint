# @voice/writing-rules

Contextual writing rules, a small lexical signal scanner and local review-prompt
composition. Each rule names a negative writing pattern, its symptom and reader
cost before presenting the remedy. The catalogue contains 20 rules, four task profiles, English/German
examples, deliberate keep cases and source provenance. It is an internal workspace
package and is not published to npm.

```sh
npm --prefix packages/writing-rules run build
npm --prefix packages/writing-rules test
```

```ts
import { findWritingSignals, composeWritingReviewPrompt } from '@voice/writing-rules';

const result = findWritingSignals('A powerful example.', { language: 'en' });
// Candidate quote with UTF-16 offsets; context may justify keeping it.
const instructions = composeWritingReviewPrompt({
  profile: 'public-docs', audience: 'Developers',
  goal: 'Open a source folder and complete one review'
});
// Host supplies the document separately and decides whether to start a reviewer.
```

The runtime ESM entry is self-contained. The build embeds private data copies;
separate JSON exports remain available for inspection. Changing those exports
does not configure the API. The package has no runtime dependencies, browser
globals, network calls or source writes. The build supplies TypeScript declarations
and JSDoc.

`findWritingSignals` checks eight rules using sixteen language-specific patterns.
It does not evaluate document structure, truth, unnecessary caution or authorship.
The returned coverage lists selected rules without lexical patterns. Quoted text,
code and technical uses are not excluded. Every match requires review; no matches
does not establish quality. Offsets address the input string, not a source file
or DOM node. A host must validate its own mapping before creating review findings.

`composeWritingReviewPrompt` returns text and selected rule IDs, not a model
response. It defaults to six public-docs rules and asks for at most five findings.
The count is a requested format, not a guaranteed inference budget. Audience and
goal are trusted host configuration; source documents belong in separate input.

The catalogue applies research and editorial guidance to informational headings through
the existing `word-choice`, `format-fit` and `meta-framing` rules. Their EN/DE prompts
ask for the concrete subject or task, compare added interpretation with the brief,
and preserve genuine reader questions, explanatory metaphors and accepted positioning.
Select these IDs explicitly for this combined scope. Source records distinguish
research context from editorial derivation. These are instructions for a contextual
reviewer; the lexical scanner has no new heading detector.

Catalogue 0.2.2 adds contextual review of evaluative modifiers to `claims-evidence`.
For example, “valid exceptions” needs a criterion; “valid JSON” can name a
syntactic requirement. The EN/DE prompts ask the reviewer to retain that
distinction. This is an editorial application of the cited word-choice guidance,
not a measured model capability or a new lexical detector. Prompt text changed;
compare new model runs under this version and keep older benchmark records pinned
to their original catalogue version.

Selection is deterministic. Explicit IDs outside a selected profile throw rather
than silently change the requested coverage. Public data and results are frozen.
Provider advice, editorial choices and research context remain separately tagged.

The complete usage contract is in [the maintained guide](../../docs/writing-rules.md).

Agent tool integration is available through `@voice/writing-rules/tools`. See [LLM tool use](./TOOLS.md) for the four read-only tools, trusted host context, model-evidence contract and examples. `@voice/review` is the separate HTML visualization library.
