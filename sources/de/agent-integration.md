# KI-Befunde in der eigenen Anwendung anzeigen

Übergib validierte Modellbefunde an `@voice/review`, um sie auf der Seite anzuzeigen und den betroffenen Text prüfen zu lassen. Deine Anwendung führt das Modell aus und ist für Quelltextadapter, Review-UI und Speicherung zuständig. Die Library zeichnet die Befunde ein und liefert native Textauswahlen zurück.

## Die Modelleingabe vorbereiten

Erfasse vor dem Review die Quelltextversion und ihre zugeordneten Texteinheiten. Gib dem Modell diese Einheiten, den Zweck der Seite, freigegebene Aussagen und die konkreten Prüffragen. Behalte die ursprüngliche Quelltextversion am Ergebnis bei.

Validiere das zurückgegebene JSON vor der Anzeige. Jeder direkt im Text angezeigte Befund benötigt die Felder von `Finding`: Regel, Kategorie, Schweregrad, Erklärung, Einheiten-ID, exaktes Zitat und Textbereich. Bereiche verwenden nullbasierte, halboffene UTF-16-Offsets innerhalb der Einheit. Wandle Codepoint-Offsets ausdrücklich um, falls dein Modelladapter solche zurückgibt. Eine Aussage ohne nutzbaren Textanker gehört in den Bericht der Host-Anwendung. Zeichne dafür keine geschätzte Unterstreichung ein. Halte Auslassungen und fehlende Belege im Bericht fest.

## Ein geprüftes Ergebnis anzeigen

Die folgende TypeScript-Funktion nimmt ein Ergebnis entgegen, dessen JSON-Struktur deine Host-Anwendung bereits validiert hat. Vor dem Einbinden prüft sie zusätzlich Quelltextversion und Zitat. `root` muss die passenden `data-voice-unit`-Elemente des Adapters enthalten. Ihr zuordenbarer DOM-Text muss mit `TextUnit.text` übereinstimmen.

```ts
import {
  mountVoiceReview,
  type Finding, type SelectionTarget, type TextUnit,
} from '@voice/review';

type Snapshot = { version: string; units: readonly TextUnit[] };
type CheckedResult = { sourceVersion: string; findings: readonly Finding[] };

export function showModelReview(
  root: HTMLElement,
  snapshot: Snapshot,
  result: CheckedResult,
  onSelect: (selection: SelectionTarget) => void,
) {
  if (result.sourceVersion !== snapshot.version) {
    throw new Error('Reload the source before reviewing this result.');
  }
  for (const finding of result.findings) {
    const unit = snapshot.units.find(item => item.id === finding.unitId);
    if (!unit || !Number.isInteger(finding.start) || !Number.isInteger(finding.end)
      || finding.start < 0 || finding.end <= finding.start
      || finding.end > unit.text.length
      || unit.text.slice(finding.start, finding.end) !== finding.quote) {
      throw new Error('A finding does not match the reviewed source.');
    }
  }
  return mountVoiceReview({
    root, units: snapshot.units, findings: result.findings, feedback: [], onSelect,
  });
}
```

Mit `getDiagnostics()` des zurückgegebenen Controllers prüfst du nicht zugeordnete Einheiten und veraltete Anker. Rufe `update({ findings, feedback })` auf, wenn dieselbe Ansicht neue Review-Daten erhält. Rufe `dispose()` auf, wenn die Route abgebaut oder das iframe ersetzt wird. Stelle neben den Markierungen eine barrierefreie Befundliste bereit. Der [Integrationsleitfaden zu Typen](library-types.md) beschreibt die Paketeinrichtung und enthält vollständige TypeScript- und JavaScript-Beispiele.

## Eine laufende Website mit Studio verbinden

Installiere für ein Review in Studio die gebaute Library und rufe `connectVoiceStudio({ studioOrigin: 'http://127.0.0.1:5188' })` nur bei aktiviertem Entwicklungs- und Review-Modus deiner Anwendung auf. Konfiguriere die Quelldatei der Route und die zugehörigen Rendering-Dateien in `voice.config.json`. Der [Bridge-Leitfaden](../packages/review/LIVE-BRIDGE.md) definiert Origin-Prüfungen, Routenwechsel und das Aufräumen der Verbindung. Die Website benötigt eine ausdrückliche Integration und muss das Einbetten durch die lokale Studio-Origin erlauben.

Studio stellt den Review-Controller über diese Bridge bereit. Binde keinen zweiten Controller über derselben Seite ein. Backend-Tokens gehören in die Sitzung des Studio-Hosts und werden nicht an die Website gesendet.

## Feedback speichern oder eine Änderung vorschlagen

Ein autorisierter Host kann `createReviewClient` für `getDocument` und `saveFeedback` verwenden. Übergib das aktuelle, im Arbeitsspeicher gehaltene Token über dessen Token-Getter und führe `expectedVersion`, `expectedReviewRevision` und `requestId` unverändert mit. Verwende bei einer Wiederholung desselben Anfrageinhalts dieselbe Anforderungs-ID. Bewahre bei einem Konflikt den Entwurf auf und prüfe ihn anhand des aktualisierten Quelltexts.

Das Studio-Backend bietet außerdem Entscheidungen zum Beibehalten von Text, generierte Alternativen, semantische Datei-Reviews und Quelltextaufgaben. Ihre Endpunkte und Versionsprüfungen sind im [Workflow](workflow.md) und im [Runner-Leitfaden](runner-integration.md) beschrieben. Die Auswahl einer Alternative bereitet einen Diff vor; die Übernahme ist eine eigene Aktion. Ein Modellaufruf erfordert eine ausdrücklich konfigurierte Runner-Route und eine Startanforderung.

## Eine Aufgabe für den Integrationsagenten

```text
Add opt-in Voice review to [application/route].

Map the rendered text to [source file] with exact TextUnit IDs and UTF-16 ranges.
Use the built @voice/review package and [exact local Studio origin].
Keep model execution in the host; validate results against the captured source.
Provide an accessible findings list, native selection and review callbacks.
Save feedback through the backend with source/review preconditions.
Dispose the integration on teardown and clear stale anchors on navigation.

Verify inline markup, an emoji before the selected text, native links/buttons,
missing mappings, reload/disposal and a narrow and wide viewport.
Return the changed files, source/build identity, results and remaining gaps.
Use the task's existing authorization for model starts and source/Git changes.
```
