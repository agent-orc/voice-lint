# Voice Studio and the embeddable JavaScript review library

> Implementation update, 2026-09-06: Preview 0.2 now exists in `C:/Projects/agent-taskboard-devspace/voice-studio` (Angular, .NET, `@voice/review`). See the [current dossier section](operations/voice-concept-revision/index.html#voice-studio-current) for shipped behaviour, tests, source-adapter limits and model strategy. The design contract below is broader than this delivery; its proposed names and APIs are not the implemented package contract.

Design status: proposed `design-0` extension, 2026-09-06. The implementation update above supersedes the earlier no-implementation status. This is the current delivery priority, ahead of the broad M0–M6 programme. The operator selected the Quality Studio website as the pilot.

The product has two entry points built from one JavaScript library. **Voice Studio** is a local web application that opens a website preview or renders a Markdown document. **Voice Review** is the working name of the library that can also be embedded directly into a host application's developer mode. In both, a user sees findings underlined in the text, selects any passage, records feedback, and reviews a proposed change in context. Feedback survives a browser restart in repository-owned metadata. The linter remains the analysis engine; a separate review service owns feedback and proposed edits.

This revision changes the entry point and delivery order of [VL-W1](operations/voice-concept-revision/index.html#on-page-review). It retains source-located evidence, German and English support, explicit coverage, advisory semantic analysis and the existing runtime boundary. A small Studio host and Markdown support belong to the first delivery. A repository-wide dashboard, broad provider integrations and calibrated scores do not.

## 0. One library, two hosts

| Surface | User opens | Integration |
|---|---|---|
| Embedded developer mode | Their existing local website | Mount the JS review library with a source adapter and review client; unmount on exit |
| Voice Studio | A local web app with an address/source bar, back/reload controls, page or Markdown view and a review panel | The Studio mounts the same library and connects it to its local companion |

The proposed package facade is `@voice-lint/review`. It exposes ESM JavaScript and TypeScript types, has no Angular/React dependency, and offers an optional standalone bundle for static pages. The implementation separates contracts and anchoring, rendering, analysis clients and persistence clients. The default UI uses isolated styles; an application can use the headless review controller with its own panel. No framework, agent platform, provider account or repository layout is forced on the consumer.

Proposed integration, illustrative only:

```js
import { mountVoiceReview } from '@voice-lint/review';

const review = mountVoiceReview({
  root: document.querySelector('main'),
  source: siteTextAdapter,
  client: authenticatedReviewClient,
  panel: document.querySelector('#developer-tools')
});

// During host teardown:
review.dispose();
```

The source adapter exposes stable document/unit identities, text classes, locale, rendered ranges and source-version changes. The client exposes analysis, annotation CRUD, proposal and request operations with revisions; it does not expose a generic file writer. Lifecycle includes `ready`, `selectionChanged`, `feedbackSaved`, `sourceChanged` and `error`. `dispose()` removes listeners, observers, marks and transient previews. Mounting twice is rejected or returns the existing instance, never duplicate observers. SPA navigation and language switching invalidate only the affected document session.

The host supplies an adapter for its content system. Initial adapters: static HTML/i18n dictionary, Markdown, and read-only DOM text. Applications with a CMS can implement the same contract using content IDs and their own persistence service. The library never guesses a local repository path from a browser URL. Analysis and feedback remain usable independently: a host may initially register only the annotation capability.

### What “open any website” means

The Studio address bar accepts a URL or a registered local source. It reports actual capabilities instead of implying that every URL can be edited:

| Source | View | Annotate/analyze | Source changes |
|---|---|---|---|
| Registered local static site | Companion-hosted working copy | Full, through the injected preview bridge and source map | Guarded edits to registered units |
| Registered local dev server | Framed preview; explicit adapter/proxy integration when required | Full when a supported bridge is available | Through its registered source adapter |
| Registered Markdown file | Studio-owned rendered view and source view | Full, mapped to the original Markdown | Guarded Markdown edits |
| Unconnected or remote URL | Browse if the site permits framing | Only with a permitted bridge; otherwise explicit unavailable state | Read-only until a matching local source/revision is connected |

An ordinary web application cannot inspect every cross-origin frame or bypass a site's frame policy. Do not strip CSP, copy login cookies or silently proxy authenticated third-party pages to create an illusion of support. When embedding or inspection is unavailable, show the reason and offer **Open externally**, **Connect local source**, or **Import a saved document**. A later browser-extension adapter can broaden URL review; it is not required for the primarily local workflow. Studio only fetches or proxies origins explicitly registered in trusted runtime configuration, never an unrestricted browser-supplied fetch URL.

### Markdown is a first-class source

Open a registered `.md` file or folder in Studio. **Rendered** and **Source** are two views of the same document, notes and selection. An AST/source-map adapter retains original Markdown offsets while displaying headings, emphasis, lists and links. Highlight the words of `[the guide](./guide.md)`, preserve the link target on a wording edit, and exclude fenced code, inline code, URLs and syntax from prose rules. Raw HTML is sanitized and embedded scripts never run in the Markdown viewer.

Markdown lacks permanent i18n keys. Persist a document identity plus block anchor, heading ancestry, exact quote/context and original-source range. Block identities use a sidecar identity table, not source-line numbers alone. Unchanged blocks retain identity after neighbouring text is inserted; ambiguous duplicate or split/merged blocks require reattachment. A Markdown proposal contains original-source replacements and a rendered comparison. A rendered-text replacement must not destroy emphasis, links or code; when structural round-trip mapping is unsupported, allow a reviewed source diff instead of guessing. Frontmatter language and explicit user selection define locale; unknown language is disclosed. Multilingual blocks may carry separate locale attributes.

## 1. First useful session

1. Open the Quality Studio website through Voice Studio's local source bar, or enable **Text review** in the website's embedded developer mode. The page retains its typography, navigation, links and responsive layout. Opening a Markdown document uses the same workflow.
2. Choose **Analyze page**. Underlines appear beneath specific words; a compact toolbar reports findings and which text units were checked. Analysis is optional: a human can give feedback before any analyzer is available.
3. Select an underlined phrase, or select ordinary text and choose **Give feedback**. The side panel shows the quote, language, text class, explanation and origin of the finding.
4. Record feedback such as “Too vague: say what the CI workflow actually does.” Choose **Needs change**, **Fact needs checking**, **Style preference**, **Good example**, or **False positive**. A free-form comment is enough; a rule ID is not required.
5. Choose **Save feedback**. Only an acknowledged durable write produces **Saved**. Reloading the page restores the note at the same text unit. A failed write leaves the draft visible with **Retry**.
6. Choose **Suggest improvement**. See one proposal, its reason, retained facts, unresolved questions and a before/after comparison. Edit the proposed wording if needed. Deterministic fixes and human-authored proposals work without a model.
7. Choose **Preview on page** to inspect line wrapping and meaning in place. Choose **Apply to local source** separately to change the registered text unit. A stale source blocks application and asks for a refreshed comparison.
8. Re-run analysis and review the result. A human note closes only after **Verify and resolve**. If the change needs engineering or factual research, choose **Request improvement** to prepare a bounded request for an agent.

The first acceptance is one real session completing this path on `stTitle` and `stIntro` and on an EN/DE Markdown fixture, with metadata surviving browser and service restarts. The same library must work in both Studio and a minimal standalone host. A prototype with local in-memory notes does not satisfy this acceptance.

## 2. Surface and interaction design

### Toolbar

Use the existing developer-mode entry point where a host has one. The inspected Quality Studio website has no developer-mode integration, so its local preview gains an explicit **Text review** toggle. In Studio this mode is part of the host toolbar. Ordinary production output omits the review bundle, transport, source map and metadata.

The active toolbar contains **Analyze page**, **Give feedback**, **Previous/next finding**, and **Close review**. Language remains the website's language control. Secondary details show checked units, excluded units, source freshness, save state and the selected analysis scope. No aggregate “voice score” appears. Zero findings with incomplete coverage is labelled **Partly checked**, not **All clear**.

### Marks in the text

Keep the Specimen's thin underlines. Color names a family and line style identifies origin:

| Meaning | Visual | Accessible equivalent |
|---|---|---|
| Structure | Blue underline | “Structure”, rule and explanation in the panel |
| Claim or factual question | Orange underline | “Claim”, evidence or question |
| Wording or voice | Purple underline | “Wording”, matched expression |
| Meta commentary | Ochre underline | “Meta commentary”, matched expression |
| Human feedback | Dotted underline in its family; neutral if uncategorized | “Your feedback” and category |
| Selected finding | Slight text background plus its underline | Selected item in the findings list |

Do not underline an entire paragraph when a phrase explains the finding. A sentence-level observation may select a sentence. Multiple findings on the same span share the mark and open a list; do not stack illegible lines. Previous/next navigation and a labelled finding list provide keyboard access without making every word a tab stop. Hover is a convenience only. Selecting a link's text must not activate the link; normal link clicks remain normal outside selection mode.

Desktop uses a resizable right panel, initially about 360 px. The page viewport becomes smaller rather than being obscured. An optional floating panel preserves the original viewport for layout review. Narrow layouts use a dismissible full-width sheet; the selected quote remains visible in the sheet. Closing restores focus and scroll position. Switching locale closes any temporary rewrite preview and preserves a locale-scoped unsaved draft.

### One panel, progressive detail

The default panel shows the quote, **Why this was marked**, feedback type, comment, save state and **Suggest improvement**. **Analysis details** reveals engine/version, rule, text class, source reference, coverage and measurement units. **History** shows feedback and proposal events. Filesystem internals do not occupy the primary editorial flow.

“Confirm finding” means the finding is valid. “Apply proposal” means source text may change. Avoid an ambiguous **Accept** button for both actions. **Keep here as exception** records a reason and scope; **False positive** records a rule-quality judgment. Neither silently changes the global profile.

## 3. Pilot integration and source identity

The inspected pilot is `C:/Projects/quality-studio-website/index.html`: a static page with inline script and an EN/DE dictionary, applied through `data-i18n` and `setLang`. There is no package manifest or build step. Reuse its dictionary keys; do not first migrate the website to Angular, an external CMS, or a new translation system.

The first website adapter reads the dictionary as syntax, without evaluating arbitrary source code, and builds a dev-only manifest. Unsupported computed values are reported as unmapped. A local companion serves the Studio shell and registered working-copy previews and supplies the review transport. Markdown uses a distinct parser adapter behind the same review model. Future Angular or other host integrations reuse the JS library and contracts.

### Identity has three layers

| Layer | Fields | Purpose |
|---|---|---|
| Document | Registered site ID, stable document ID, route variant, locale | Keep websites, pages, variants and translations separate |
| Text unit | Stable `unit_id`, source reference and text class | For example `stIntro`, EN, dictionary property in `index.html` |
| Anchor | Unit text version, exact quote, prefix/suffix, half-open code-point range | Locate the selected passage inside that unit |

`data-i18n="stIntro"` is a stable unit key; a CSS path, URL, line number or DOM node index alone is not. Multiple renderings of the same dictionary key share a source unit and have separate occurrence IDs. Show **Used in 2 places** before an edit affects both.

The source map relates original file spans, decoded dictionary-string spans and rendered DOM text. HTML entities, escaped quotes, CRLF, emoji and combining marks require explicit mapping. Persist proposed canonical `unicode_code_point` positions, consistent with the existing architecture. Convert to DOM UTF-16 offsets only at the browser boundary; neither offset unit may be silently substituted for the other. Do not normalize source bytes before calculating patch preconditions.

Use stable unit identity plus quote/context selectors inspired by the [W3C Web Annotation model](https://www.w3.org/TR/annotation-model/#text-quote-selector). It provides a useful anchoring vocabulary; Voice Review does not claim JSON-LD or protocol conformance. DOM selection uses [Range](https://dom.spec.whatwg.org/#concept-range). Underlines should use range rectangles in an isolated overlay, keeping source markup untouched; the [CSS Custom Highlight specification](https://drafts.csswg.org/css-highlight-api-1/) is a rendering option, subject to a browser capability check. That specification does not by itself provide interactive finding controls. Selection and hit testing remain overlay responsibilities.

### After change

- Same unit ID and same decoded text: keep anchors even when CSS, wrapping, neighbouring units or the document's overall hash changed.
- Text changed, quote and context uniquely match inside the same unit: reattach as **Needs recheck**. Keep the original anchor and the reattachment event. Existing proposals remain stale.
- Several matches, missing unit, changed locale or unsupported mapping: show **Needs reattachment** in the panel. Never guess a new target or apply a patch by fuzzy matching.
- A moved unit with an explicit identity migration may retain history. A similarly named new key does not silently inherit it.
- Changing locale reprojects notes for that locale. A DE note never lands on an EN string. A cross-language improvement request may explicitly link two reviewed units.

Selection may span inline markup within one unit. A selection across units becomes one feedback item with multiple targets; the UI lists those targets. Source application is atomic for an explicitly approved group or refuses the whole group if any precondition changed.

## 4. Durable metadata

Review persistence is an explicit product action. It is not analyzer logging or an implicit cache. Starting a review session shows the registered repository destination once. **Save feedback**, **Save proposal**, and **Save analysis snapshot** specify what is retained. Later saves in that session need no repetitive confirmation. The browser's storage is never the authoritative record.

Proposed layout inside the website repository:

```text
.voice-lint/
  profile.yml
  facts.yml                         # introduced when facts are registered
  reviews/
    quality-home.en.voice-meta.json  # server-derived stable document ID
    quality-home.de.voice-meta.json
    readme.en.voice-meta.json        # Markdown uses the same review contract
  requests/
    request-<random-id>.json         # bounded improvement requests
```

One sidecar per logical document and locale stores durable annotation IDs, anchors, comments, human dispositions, proposals and event history. It may hold the last explicitly saved analysis snapshot with full version/coverage metadata. New analysis replaces machine snapshots, never human notes. Do not create a complete duplicate of the website in every sidecar.

An annotation ID is random and survives new analysis runs. A run-scoped analyzer `finding_id` is merely a link, not the identity of human feedback. On a compatible rerun, reconciliation uses rule/version, unit and anchored evidence; uncertain matches remain unlinked. Provenance records `human`, `deterministic` or `agent` for findings and proposals.

Minimum contract example, with implemented DE and EN fixtures in the Voice Studio workspace under `examples/quality-website/` and `examples/markdown-handbook/`:

```json
{
  "schema_version": "design-0",
  "document_id": "quality-home",
  "locale": "en",
  "revision": 3,
  "annotations": [{
    "annotation_id": "note-example-01",
    "origin": "human",
    "state": "open",
    "category": "factual_question",
    "target": {
      "unit_id": "stIntro",
      "position_encoding": "unicode_code_point",
      "start_char": 128,
      "end_char": 141,
      "quote": "covered by CI"
    },
    "comment": "State which workflow runs and what it checks."
  }]
}
```

This minimal example omits the version precondition and context fields required by a writable service; the paired fixtures show them. Original-source locations continue to use the canonical `SourceRange`; these anchor offsets are explicitly relative to the decoded text unit.

Repository sidecars may contain selected quotes, comments, proposed replacement text and unsalted source digests after explicit review-storage opt-in. These fields are not anonymous. They are never emitted to default logs, put in public build output or included in a generic analyzer result unless requested. Full DOM snapshots, page input values, credentials, raw provider conversations and unrelated document text are excluded. Diagnostic opt-ins do not substitute for review-storage opt-in or vice versa.

### Writes and failures

The companion derives paths from trusted registered IDs. Writes validate schema and expected revision, serialize per document, and use an atomic replace with a recoverable journal. The success response includes the durable revision and event ID only after commit. On revision mismatch return a conflict and the current revision; never overwrite another tab's comment. Retrying with the same idempotency key returns the original result without duplicate notes or agent requests. A source edit plus its review event uses a recoverable transaction so a crash cannot leave an applied edit represented as unapplied.

Unknown future schema versions open read-only. A missing or corrupt sidecar is an explicit state, not an empty successful review. Users can export their notes and archive an annotation; destructive removal and repository-history retention remain explicit operations. Draft memory loss is disclosed when leaving with unsaved work; an optional local draft cache needs separate opt-in.

## 5. Feedback and improvement are different state machines

| Object | States | Completion rule |
|---|---|---|
| Human annotation | `open`, `needs_recheck`, `needs_reattachment`, `resolved`, `archived` | Human verifies the relevant revision before resolving |
| Review judgment | `unreviewed`, `confirmed`, `false_positive`, `waived`, `positive_example` | A scoped editorial decision; does not directly change analyzer policy |
| Proposal | `draft`, `ready`, `previewing`, `applied`, `rejected`, `stale` | Source service acknowledges a guarded edit before `applied` |
| Improvement request | `draft`, `queued`, `running`, `review_ready`, `completed`, `failed`, `cancelled` | Result and verification link back to original annotation IDs |

These are review-service enums, not additions to the canonical analyzer `FindingDisposition`. An explicit, reviewed suppression can later map to `suppressed_source`; a UI dismissal alone cannot alter CI. “No longer detected” updates a machine finding but does not automatically resolve a human complaint. Changing the ruleset or profile marks analysis drift; unchanged human feedback remains readable.

## 6. Suggestions that preserve meaning

Offer one focused proposal initially. A second alternative is useful only when there is a real editorial choice. Show the affected source units, before/after wording, reason, facts relied on and any unresolved factual question. Do not reward removal of useful facts merely because it lowers a finding count.

There are three independent proposal sources:

1. **Rule fix:** a narrow deterministic edit, such as removing a terminal heading period. The proposal identifies the exact rule and changed characters.
2. **Your wording:** editable replacement text, persisted as a human proposal. This enables the first complete feedback-to-change loop without inference.
3. **Agent proposal:** a bounded request to the user's configured agent system. The initial handover is a portable request artifact; an Agent Studio adapter may dispatch it through the application Task API. The core does not start arbitrary commands from browser input.

The user action **Request improvement** opens a reviewable request containing quote, selected units, comments, relevant profile examples, allowed facts, forbidden changes, locale scope and acceptance criteria. Its default scope is one section, not the whole website. **Send request** is the distinct dispatch action. A pending, failed or cancelled dispatch remains visible; retries cannot create duplicate tasks. The present concept task creates no live implementation cards or billable runs.

The agent returns a proposal with source/version preconditions. It must not invent product features, dates, test coverage, publication state or a source citation. It may flag “fact required” and propose deletion of an unnecessary assertion. Deletion is visible in the diff. The service rejects edits outside the registered units and expected file revision. Applying a patch changes the local working tree only; commit, push and publication follow the host project's normal workflow.

A claim absent from a registry means **Unverified**, not **False**. Token overlap cannot prove a fact or justify an automatic source edit. Confirmed factual evidence and an explicitly linked registry entry can support a proposal; ambiguous matches stay advisory. This corrects the older dossier's assumption that an unmatched claim is automatically a blocking error.

After application, run the relevant deterministic checks and review both the text and its rendering. At most two automated correction rounds run per request. Unresolved facts or repeated failures return to the human. Preserve useful wording as explicit good/bad example candidates; a separate **Promote to profile example** operation shows the profile diff. Feedback never silently retrains a model or changes all future writing rules.

## 7. Local developer transport

The first release operates on the local working copy of the real website. The browser is not allowed to edit arbitrary paths, and a public page's developer toggle is not authentication. Production-page review with a browser extension is a later adapter that must identify the deployed revision before offering any source edit.

Proposed trusted startup entry: `voice-lint dev --site quality-studio`. It is not a working command. `quality-studio` resolves in user-owned runtime configuration to one repository root, preview setup, source adapter, allowed profile and optional agent handover. A repository profile cannot register roots, choose endpoints or grant write or paid execution rights.

The companion serves Studio and review routes on an exact loopback origin. Website content is framed on a separate preview origin without the Studio bearer; the review UI and write authority stay in the parent. The preview bridge exchanges only versioned unit/selection/highlight messages, checked against exact origin, frame window, document session and nonce. It never executes a received file path or source write. Navigation discards the previous bridge session. Markdown is rendered in a sanitized, non-executing view. Untrusted website scripts cannot obtain the review token merely by sharing a page with marks.

A short-lived, one-use pairing code displayed in the terminal establishes a scoped browser bearer through an exact-origin, rate-limited pairing endpoint. The browser bearer is held in memory. It is not a cookie, URL parameter, HTML token, localStorage value or the core API bearer. The core token remains in trusted IPC or its protected runtime file. Restart requires a fresh session. Embedded-library mode in an application the user trusts may supply its own authenticated client; an arbitrary framed page gets no such client. The first transport spike must validate both trust paths before source writes are enabled.

Proposed review-service operations under `/review/v0`, separate from the unchanged direct-text analysis API:

| Operation | Input boundary | Result |
|---|---|---|
| Read document/session | Registered site/document ID, locale | Manifest, versions, notes, capabilities |
| Analyze registered units | Known unit IDs and expected source version | Canonical findings, mapped anchors, explicit coverage |
| Save annotation/judgment | Unit anchors, comment, expected sidecar revision, idempotency key | Durable event and revision |
| Prepare/save proposal | Known units, before version, replacement text | Validated proposal, diff and checks |
| Apply proposal | Proposal ID, expected source and sidecar revisions | Transaction result and new versions |
| Prepare/dispatch improvement | Annotation/proposal IDs, explicit allowed scope | Durable request ID; optional task reference |

Read operations use GET; analysis and mutations use POST. Payloads cannot choose a file path, executable, endpoint, credential, model, runtime mode or fallback. Exact Host/Origin checks, session scopes, quotas and canonical path containment apply. The pilot companion renders only the registered public website source and assets; it never serves `.voice-lint`, credentials or repository internals as static files. A normal production artifact must prove their absence.

The standalone `strict_offline` CLI stays socket-free. A browser/companion session is a local developer transport, not a claim that the whole workflow opens no sockets. The analysis core can remain deterministic and socket-free inside it. Provider inference is optional and governed by trusted runtime settings and explicit execution scope; missing provider access leaves annotation, rule fixes and manual proposals usable.

## 8. Delivery order and ownership

The following are proposed work packages, not created ticket IDs or date promises. Release the small usable slices in order; the small Studio host is included immediately, while the larger repository-management UI can follow.

| Package | Delivery and owner | Required evidence |
|---|---|---|
| P1: JS library, Studio host and anchors | VL framework-independent package, small Studio shell, QSW static dictionary and Markdown adapters | Same library in Studio and standalone embed; select EN/DE website and Markdown text; exact mapping through markup, emoji and language switch; production page unaffected |
| P2: durable feedback | VL review service, session and metadata writer; QSW local launch recipe | Save, reload and restart; conflicting tabs; interrupted writes; two locales remain separate |
| P3: first useful analysis | VL initial R1, R6, R9 and narrow R8 checks with DE/EN fixtures; text classes and declared exclusions | Findings underline the correct source spans; false-positive notes survive rerun; uncalibrated metrics never gate |
| P4: proposal to verified edit | VL proposal service and guarded QSW/Markdown source adapters | Rule fix and manual proposal → preview → exact source patch → reload → recheck → human resolve; stale patch refused; Markdown links/formatting preserved |
| P5: bounded agent improvement | VL portable request + optional AGT Task API adapter | One scoped request, visible status, one returned diff, no duplicate dispatch, no automatic publication |
| P6: repeat use and expansion | VL feedback-derived example review, QSW pilot corrections, then AOW/WEB adapters | At least ten real reviewed passages across EN/DE; retained facts checked; feedback retention and correction outcomes recorded |

P1–P2 are the first user trial: useful human feedback without waiting for analyzer breadth. P1–P4 are the minimum daily-use tool requested here. P5 supplies richer proposed wording through the existing agent workflow. CI gating, the broad facts ledger and a standalone Voice Studio view follow practical calibration; none blocks this first tool.

Acceptance must include keyboard-only use; narrow, medium and desktop widths; supported light/dark rendering; links and selection; overlapping findings; inline markup; quote ambiguity; file changes outside the target; unexpected locale changes; source/sidecar conflicts; failed saving; missing analyzers; agent cancellation; and production-bundle exclusion. Test mount/dispose/remount, SPA navigation, frame-policy refusal, spoofed bridge messages, Markdown code exclusions, raw-HTML sanitization and paragraph reordering. A note must remain retrievable even when its anchor can no longer be attached.

## 9. Changes to the previous concept

- Make an embeddable JS library and a small local Voice Studio host the two entry points. Website and Markdown review share annotations, proposals and persistence. Move feedback ahead of the full CLI/API/provider programme.
- Add human-created annotations as a first-class input, including positive examples. The old finding-only lifecycle was insufficient.
- Make source identity, locale and reattachment explicit before writing a source adapter.
- Keep analysis disposition, editorial judgment, proposal application and publication distinct.
- Persist intentionally saved review artifacts; preserve content-free default analysis logs and opt-in caching.
- Treat registry absence as unverified. Introduce hard gates only for validated, concrete rules and explicit policy.
- The old programme summary says fourteen cards/four phases, but its table has fifteen entries and phases 0–4. Keep it as historical planning; P1–P6 above define the current priority.

Working recommendations are: use the existing website dictionary, ship the JS library with a local Studio/companion and Markdown adapter, keep metadata in the reviewed repository, and let the user verify source changes before normal publication. The pilot choice, JS embedding, local Studio host and Markdown support are user direction. Exact package names, transport schemas and UI measurements remain proposed until their implementation acceptance passes.
