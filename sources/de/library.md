# @voice/review

Eine frameworkunabhängige JavaScript-Library für Textreviews auf einer lokalen Webseite. Angular, einfaches HTML und iframe-Hosts mit demselben Origin verwenden denselben Controller. Die Library zeichnet übergebene Analysebefunde als durchgezogene Unterstreichungen und menschliches Feedback als gepunktete Unterstreichungen. Die native Textauswahl liefert neue Feedback-Anker. Die einbindende Anwendung stellt die Analyse bereit; Quellbearbeitung liegt außerhalb der Library-API.

## Bauen und verwenden

Im Voice-Studio-Arbeitsverzeichnis:

```sh
npm run build -w @voice/review
npm test -w @voice/review
```

Das Paket exportiert ESM und TypeScript-Deklarationen über `@voice/review`. `dist/voice-review.js` ist ein eigenständiges Browser-Bundle mit dem Global `window.VoiceReview`. Es enthält weder eine Angular-Abhängigkeit noch Paketabhängigkeiten zur Laufzeit. Die einbindende Anwendung kann diese Datei in ihre lokalen Entwicklungs-Assets kopieren. Studio liefert sie unter `/library/voice-review.js` aus; siehe `examples/library-embed/index.html` im Repository.

## IntelliSense für TypeScript und JavaScript

Die öffentliche ESM-API enthält Deklarationsdateien und JSDoc für Vervollständigung, abgeleitete Callback-Typen und Hover-Hilfe. Importiere Typen wie `TextUnit`, `Finding`, `SourceSpan` und `VoiceReviewController` direkt aus `@voice/review`. Einfaches JavaScript kann `// @ts-check` und JSDoc-Typen mit `import('@voice/review')` nutzen. Geprüfte Beispiele liegen unter [examples/](./examples/): [TypeScript](./examples/typescript.ts), [JavaScript](./examples/javascript.js) und das [Global für klassische Skripte](./examples/standalone.js).

Verwende in einem gewöhnlichen Browser-Skript `/// <reference types="@voice/review/standalone" />`, um Editor-Typen einzubinden. Lade `voice-review.js` gesondert mit einem klassischen `<script>`-Tag. Die Typreferenz lädt keinen Laufzeitcode. Nutze für ESM-Importe den Haupteinstiegspunkt.

Mit `npm run test:types -w @voice/review` prüfst du Deklarationen und Editor-Metadaten. [Die typisierte Library einbinden](../../docs/library-types.md) enthält vollständige Einrichtungsbeispiele und beschreibt die Prüfungen aus Sicht einer einbindenden Anwendung.

## In bestehendes HTML einbinden

Vergib im Entwicklungs-Markup ausdrückliche Kennungen für Texteinheiten. Einheiten sollten nicht überlappende Blöcke oder Spans sein. Ihr zusammengefügter DOM-Text muss exakt dem zugehörigen `TextUnit.text` entsprechen, einschließlich Leerraum. Der Adapter überspringt Skript-, Stil- und Template-Bereiche sowie verborgene Bereiche, `aria-hidden="true"` und `data-voice-exclude`. Verwende `data-voice-exclude` für sichtbaren Inline-Code, den der Textadapter ausschließt.

```html
<main id="preview">
  <p data-voice-unit="intro">Eine <strong>präzise</strong> Aussage.</p>
</main>
```

```js
import { getUnitText, mountVoiceReview } from '@voice/review';

const root = document.querySelector('#preview');
const text = getUnitText(root.querySelector('[data-voice-unit="intro"]'));
const controller = mountVoiceReview({
  root,
  units: [{
    id: 'intro', text, kind: 'paragraph', language: 'de',
    // For this isolated browser-only example these are text coordinates.
    // A source adapter must supply the actual file range before source edits.
    sourceSpan: { start: 0, end: text.length, encoding: 'utf16' }
  }],
  findings: [{
    id: 'finding-1', ruleId: 'example.precision', category: 'wording',
    severity: 'info', message: 'Was bedeutet präzise hier?',
    explanation: 'Beispielbefund für die Einbindung, keine automatische Analyse.',
    quote: 'präzise', unitId: 'intro', start: 5, end: 12,
    suggestion: null, engine: 'example'
  }],
  feedback: [],
  onSelect: selection => showFeedbackForm(selection),
  onFindingSelect: finding => showFinding(finding),
  onFeedbackSelect: feedback => showFeedback(feedback)
});

// After new analysis or a saved note:
controller.update({ findings: latestFindings, feedback: savedFeedback });
controller.selectFinding('finding-1');
console.log(controller.getDiagnostics());

// On route changes, component destruction or iframe replacement:
controller.dispose();
```

`showFeedbackForm`, `showFinding`, `showFeedback`, `latestFindings` und `savedFeedback` sind Integrations-Callbacks und Daten, die die einbindende Anwendung bereitstellt. Die bestehende Einbindung eines Wurzelknotens wird vor einer zweiten Einbindung automatisch freigegeben. Wiederholtes Initialisieren erzeugt daher keine doppelten Handler oder Unterstreichungsebenen.

Lade für das eigenständige Bundle `<script src="/library/voice-review.js"></script>` und rufe `VoiceReview.mountVoiceReview(...)` mit denselben Optionen auf. Die einbindende Seite benötigt kein Build-Framework.

## Feedback über das lokale Backend speichern

Die einbindende Anwendung koppelt sich einmal mit dem lokalen Studio und stellt den erhaltenen Token bereit. Der Client überträgt die Vorbedingungen für Quellversion und Review-Revision unverändert. Das Backend schreibt gespeichertes Feedback in Metadaten-Begleitdateien des Projekts. Dieses Paket speichert es nicht in `localStorage`.

```js
import { createReviewClient, ReviewApiError } from '@voice/review';

const api = createReviewClient({
  baseUrl: '/api',
  token: () => currentPairingToken
});
let detail = await api.getDocument(projectId, documentId);

/**
 * @param {import('@voice/review').SelectionTarget} selection
 * @param {string} comment
 * @param {string} category
 * @returns {Readonly<import('@voice/review').FeedbackInput>}
 */
function prepareFeedback(selection, comment, category) {
  return Object.freeze({
    ...selection, comment, category,
    expectedVersion: detail.version,
    expectedReviewRevision: detail.reviewRevision,
    requestId: crypto.randomUUID()
  });
}

/** @param {Readonly<import('@voice/review').FeedbackInput>} input */
async function persistFeedback(input) {
  try {
    detail = await api.saveFeedback(projectId, documentId, input);
    controller.update({ units: detail.units, findings: detail.findings, feedback: detail.feedback });
  } catch (error) {
    if (error instanceof ReviewApiError && error.status === 409) {
      // Keep the user's draft, reload the document and ask them to review the
      // anchor against the new source before submitting a new request.
      showConflict(error.details);
      return;
    }
    throw error;
  }
}
```

Rufe `prepareFeedback` für eine neue oder bearbeitete Notiz einmal auf, behalte die zurückgegebene Nutzlast und übergib sie dann an `persistFeedback`. Wiederhole nach einem Netzwerkfehler mit ungewissem Ausgang `persistFeedback` mit derselben Nutzlast einschließlich Anfrage-ID und Versionsvorbedingungen. Lade nach einem 409-Konflikt das Dokument neu und prüfe den Anker, bevor du eine neue Nutzlast vorbereitest. Die einbindende Anwendung führt die Kopplung über `POST /api/session/pair` aus. Schreibe Tokens nicht in Seiten-URLs, Quellcode oder Berichte. Das Backend erlaubt keinen API-Zugriff von fremden Origins. Stelle die Vorschau unter dem Studio-Origin bereit oder konfiguriere den lokalen Entwicklungs-Proxy der einbindenden Anwendung.

## Browser- und Quellkoordinaten

Alle Review-Offsets zählen **UTF-16-Codeeinheiten**, beginnen bei null und bilden halboffene Intervalle. Dies entspricht dem Koordinatensystem von JavaScript-String-Slices und Textbereichen im Browser. `codePointOffsetToUtf16(text, offset)` wandelt Offsets einer Analyse-Engine, die Unicode-Codepoints zählt, ausdrücklich um. Übergib Bereiche aus Voice Lint Core erst, nachdem du ihre deklarierte Kodierung umgerechnet hast.

`createTextRange(element, start, end, expectedText)` ordnet Offsets über Inline-Markup hinweg zu, ohne Inhalte zu umschließen oder zu ersetzen. Das optionale `expectedText` weist veralteten Text ab. `selectionToTarget(root, units, selection)` gibt für eine Auswahl innerhalb einer zugeordneten Einheit `{ unitId, quote, start, end }` zurück. Eine Auswahl über mehrere Einheiten oder über ausgeschlossenen Inline-Code hinweg wird abgewiesen, nicht stillschweigend gekürzt. Auswahlen auf beiden Seiten von Code verwenden die richtigen Offsets. `createTextRanges(...)` gibt Bereiche pro Textknoten zurück, um Markierungen über Inline-Markup hinweg zu zeichnen, ohne ausgeschlossene Inhalte versehentlich zu markieren.

Vor dem Zeichnen von Markierungen prüft die Library sowohl den Text der Einheit als auch die exakt zitierten Teilstrings. `getDiagnostics()` meldet fehlende oder abweichende Einheiten und veraltete Anker. Erledigte Notizen und Notizen, die erneut verankert werden müssen, erscheinen nicht als aktuelle Markierungen. Überlappende Befunde und menschliche Notizen erhalten getrennte Unterstreichungslinien.

Die Kategorien sind farblich zugeordnet: Struktur blau, Behauptungen orange, Formulierung violett und Meta ocker. Die Ebene nutzt die Geometrie der Textbereiche und lässt Zeigerereignisse hindurch. Ein Klick auf Text wählt dessen präziseste Annotation. Native Links, Schaltflächen und bearbeitbare Bedienelemente behalten ihre gewohnte Interaktion. Stelle in der einbindenden Anwendung eine zugängliche Befundliste für Tastaturnavigation und Annotationen innerhalb von Links bereit. `selectFinding(id)` hebt einen ausgewählten Befund hervor und scrollt zu ihm.

Binde bei einem iframe nach dessen `load`-Ereignis mit `root: iframe.contentDocument.body` ein und gib die Einbindung beim Neuladen frei. Das iframe-Dokument muss denselben Origin haben. Die importierte Vorschau von Studio nutzt eine Sandbox ohne Skripte. Beliebige entfernte Seiten mit anderem Origin und geschlossene Shadow Roots kann dieser Adapter nicht untersuchen; sie brauchen eine ausdrückliche Integration oder einen Importweg. Die CSP einer Website muss das Library-Asset und seine Inline-Stile für Annotationen in der Entwicklungsumgebung zulassen.

## Laufende Entwicklungs-Websites

Nutze die exportierte Bridge `connectVoiceStudio({studioOrigin})`, um eine laufende Anwendung in Studio zu prüfen und dabei ihr tatsächliches CSS, JavaScript und natives Routing zu erhalten. Die Ziel-Website bindet die Library ausdrücklich ein und behält ihren eigenen Origin. [LIVE-BRIDGE.md](./LIVE-BRIDGE.md) beschreibt das genaue Origin- und Sitzungsprotokoll, die Quellzuordnung, iframe-Anforderungen und Grenzen.
