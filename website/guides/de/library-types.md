# Die typisierte Library einbinden

`@voice/review` stellt Befunde dar, die deine einbindende Anwendung liefert. Der ESM-Einstiegspunkt enthält TypeScript-Deklarationen und JSDoc für Vervollständigung, abgeleitete Callback-Typen und Hover-Hilfe. JavaScript kann `// @ts-check` nutzen; klassische Skripte können Typen für das Global `VoiceReview` referenzieren. Analyse und Quellbearbeitung liegen bei der einbindenden Anwendung, außerhalb dieser Library-API.

## Build und Editor einrichten

In diesem Arbeitsverzeichnis:

```sh
npm run build -w @voice/review
npm run test:types -w @voice/review
```

Löse Importe über den Paketnamen `@voice/review` auf, nicht über einen privaten `src/`-Pfad. Die Einträge `exports` und `types` des Pakets verweisen auf erzeugte Deklarationen. Baue das lokale Paket, bevor du es in einem anderen Projekt verwendest. Der Test für einbindende Anwendungen prüft die Modulauflösung mit `NodeNext` und `Bundler`.

In JavaScript-Projekten aktiviert `// @ts-check` die Prüfung der aktuellen Datei. Alternativ kann ein Projekt `allowJs`, `checkJs`, `strict` und `noEmit` in seiner TypeScript-Konfiguration setzen. Nimm die DOM-Library auf, wenn du die standardmäßige `lib`-Liste ersetzt. Ein Editor mit TypeScript Language Service kann Controller-Methoden, Callback-Parameter, Literaloptionen wie `encoding: 'utf16'`, Methodensignaturen und die öffentlichen JSDoc-Texte anzeigen.

## TypeScript: einbinden, aktualisieren, freigeben

Dieses vollständige Beispiel verwendet einen exakten Klartext-Quellstring. Die Beispielanwendung erzeugt ihr eigenes Markup; die Annotations-Library lässt dieses Markup unverändert. Beziehe bei HTML-, Markdown- oder Framework-Inhaltsdateien die Einheiten und Quellbereiche aus einem Quelladapter, statt Dateioffsets aus gerendertem HTML abzuleiten.

```ts
import {
  mountVoiceReview, codePointOffsetToUtf16,
  type Finding, type SourceSpan, type TextUnit,
} from '@voice/review';

export function showReview(root: HTMLElement): () => void {
  const source = '🧭 Clear copy.';
  const sourceSpan: SourceSpan = {
    start: 0, end: source.length, encoding: 'utf16',
  };
  const unit: TextUnit = {
    id: 'intro', text: source, sourceSpan,
    kind: 'paragraph', language: 'en',
  };
  const finding: Finding = {
    id: 'example-1', ruleId: 'host.example', category: 'wording', severity: 'info',
    message: 'Example finding', explanation: 'Supplied example data; no analysis is run.',
    quote: 'Clear', unitId: unit.id,
    start: codePointOffsetToUtf16(source, 2),
    end: codePointOffsetToUtf16(source, 7),
    suggestion: null, engine: 'host/example',
  };
  const paragraph = root.ownerDocument.createElement('p');
  paragraph.dataset.voiceUnit = unit.id;
  paragraph.textContent = source;
  root.replaceChildren(paragraph);

  const review = mountVoiceReview({
    root, units: [unit], findings: [finding], feedback: [],
    onSelect(selection) {
      // selection is inferred: unitId, quote, start and end.
      console.info(selection.quote);
    },
  });
  review.update({ findings: [finding] });
  console.info(review.getDiagnostics());
  return () => review.dispose();
}
```

Rufe die zurückgegebene Aufräumfunktion auf, wenn die einbindende Anwendung die Route wechselt, die Ansicht entfernt oder ihr iframe ersetzt. Rufe `mountVoiceReview` auf, nachdem das Zieldokument geladen wurde. Ein neuer Wurzelknoten benötigt eine neue Einbindung; `update()` ändert Daten und Callbacks am bestehenden Wurzelknoten. Das geprüfte Beispiel steht in [typescript.ts](../packages/review/examples/typescript.ts).

## JavaScript: dieselbe API mit JSDoc

```js
// @ts-check
import { mountVoiceReview } from '@voice/review';

/**
 * @param {HTMLElement} root
 * @param {readonly import('@voice/review').TextUnit[]} units
 * @param {readonly import('@voice/review').Finding[]} findings
 * @returns {() => void}
 */
export function showReview(root, units, findings) {
  const review = mountVoiceReview({
    root, units, findings, feedback: [],
    onSelect(selection) { console.info(selection.quote); },
  });
  return () => review.dispose();
}
```

Die Typen des Callbacks und des zurückgegebenen Controllers werden abgeleitet, ohne diese Datei in TypeScript umzuwandeln. Ein vollständiges Beispiel mit Quellbereichen steht in [javascript.js](../packages/review/examples/javascript.js).

## Ein klassisches Skript ohne Bundler

Lade den gebauten Laufzeitcode als gewöhnliches Skript und danach deine Integration:

```html
<script src="/library/voice-review.js"></script>
<script src="/review-host.js"></script>
```

Am Anfang von `review-host.js`, wenn `@voice/review` für den Editor verfügbar ist:

```js
/// <reference types="@voice/review/standalone" />
// @ts-check
const connection = VoiceReview.connectVoiceStudio({
  studioOrigin: 'http://127.0.0.1:5188',
});
window.addEventListener('pagehide', () => connection.dispose(), { once: true });
```

Die Referenz mit drei Schrägstrichen liefert nur Deklarationen. Sie lädt die Library weder herunter noch führt sie sie aus. Importiere den eigenständigen Laufzeitcode nicht als ESM-Modul, um ein Global zu erhalten: ESM verwendet benannte Importe aus `@voice/review`. Das geprüfte Global-Beispiel steht in [standalone.js](../packages/review/examples/standalone.js).

## Koordinaten und KI-Integration

`SourceSpan.start/end` beziehen sich auf die ursprüngliche Quelldatei. `start/end` eines Befunds oder einer Auswahl beziehen sich auf den Text der zugeordneten Einheit. Beide zählen **UTF-16-Codeeinheiten** ab null in halboffenen Intervallen. Ein Emoji kann zwei Codeeinheiten belegen. Im Klartextbeispiel liegt `Clear` in UTF-16 bei `[3, 8)`, während eine Codepoint-Engine `[2, 7)` meldet. Rechne beide Endpunkte mit `codePointOffsetToUtf16` um, bevor du solche Befunde an diese Library übergibst. Passende Koordinaten allein stellen noch keine Zuordnung zur Quelldatei her: Markup, Entities und ausgeschlossene Inhalte erfordern einen Adapter.

Eine einbindende Anwendung kann validierte KI-Befunde genauso an `mountVoiceReview` oder `update` übergeben wie Befunde lokaler Regeln. Sie muss das Schema der Engine, die Offset-Kodierung, das exakte Zitat, die Identität der Einheit und die Quellversion prüfen. Sie verantwortet Ziel, Marketingkontext, Modellroute, Aufgabenausführung, Herkunft der Ergebnisse und Review-Entscheidungen. Die Bridge transportiert bereitgestellte Review-Daten zu einer ausdrücklich integrierten Live-Seite; sie überträgt keine Backend-Zugangsdaten und startet keine Modellarbeit.

Nutze `createReviewClient` ausschließlich in der autorisierten einbindenden Anwendung, wenn Feedback über das Studio-Backend gespeichert werden soll. Der Client bietet typisierte Operationen `getDocument` und `saveFeedback`. Stelle den aktuellen Bearer-Token über einen von der Anwendung verwalteten Getter im Arbeitsspeicher bereit. Bette ihn niemals in die geprüfte Website, URLs, Versionsverwaltung oder Berichte ein. `FeedbackInput` enthält `expectedVersion`, `expectedReviewRevision` und eine `requestId`. Behalte bei der Wiederholung eines Speichervorgangs mit ungewissem Ausgang dieselbe Anfrage-ID und die exakte Nutzlast bei. Das Anwenden auf die Quelle bleibt ein eigener, abgesicherter Backend-Ablauf. Das Overlay allein besitzt weder einen dauerhaften Feedback-Speicher noch eine Operation zum Schreiben der Quelle.

Das [Library-README](../packages/review/README.md) enthält Beispiele zum Speichern; der [Bridge-Vertrag](../packages/review/LIVE-BRIDGE.md) beschreibt Origin- und Sitzungsprüfungen.

## Was die Prüfungen nachweisen

`packages/review/test/types.test.mjs` erstellt außerhalb dieses Arbeitsverzeichnisses eine isolierte einbindende Anwendung, die ausschließlich die deklarierten Auslieferungsdateien des Pakets nutzt. Der Test kompiliert echte TypeScript-, `checkJs`- und klassische Global-Beispiele sowie absichtlich ungültige Beispieldateien mit NodeNext- und Bundler-Auflösung. Erwartete Fehler stellen sicher, dass Anforderungen an Kodierung, Wurzelknoten, Kategorie und Callbacks nicht unbemerkt zu `any` abgeschwächt wurden.

Der Test ruft außerdem den tatsächlichen TypeScript Language Service auf: für Vervollständigung von Controller und Auswahl, Vervollständigung des klassischen Globals, Signaturen der Aufräumfunktionen und JSDoc-Hover-Texte. Damit werden die Metadaten geprüft, die kompatible Editoren verwenden. Der Test bedient weder die VS-Code-Oberfläche noch weist er das Verhalten einer bestimmten Editor-Erweiterung oder die Darstellung im eingebetteten Browser von VS Code nach. Bestehende Laufzeittests der Library prüfen Einbindung, Aktualisierungen, Freigabe, Verankerung und Bridge-Verhalten gesondert.
