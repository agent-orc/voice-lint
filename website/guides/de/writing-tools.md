# Tool-Nutzung durch LLMs

`@voice/writing-rules/tools` stellt einem Agenten vier ausschließlich lesende Tools bereit. Die einbindende Anwendung registriert deren JSON-Schemas beim Modellanbieter und führt die zurückgegebenen Tool-Aufrufe aus. Der Adapter ruft Regelwissen ab, stellt Prüfanweisungen zusammen, sucht nach festgelegten Formulierungen und liest Qualitätsnachweise, die die Anwendung bereitstellt.

`@voice/writing-rules` liefert Analyse und Prüfanweisungen. `@voice/review` ermöglicht Textauswahl und die Darstellung von Befunden in HTML. Ein Agent kann die Tools ohne Browser verwenden. Eine Website kann Befunde aus jeder kompatiblen Prüfkomponente darstellen.

## Tools registrieren und Aufrufe ausführen

```ts
import {
  writingReviewTools,
  createWritingToolDispatcher,
  type WritingToolCall,
} from '@voice/writing-rules/tools';

const dispatcher = createWritingToolDispatcher({
  reviewContext: {
    audience: 'Developers reading the setup guide',
    goal: 'Open a project folder and complete the first review',
  },
});

// Adapt each { name, description, inputSchema } descriptor to the provider's
// tool format. The host owns registration, model execution and conversation.
const definitions = writingReviewTools;

// Example of an already decoded model tool call; no model is called here.
const call: WritingToolCall = {
  name: 'find_writing_signals',
  arguments: {
    text: 'A powerful review panel.',
    language: 'en',
    ruleIds: ['word-choice'],
  },
};
const result = await dispatcher.dispatch(call);
// The host can return JSON.stringify(result) as the provider's tool result.
```

Die Beschreibungen sind anbieterunabhängige JSON-Schema-Objekte, keine Request-Objekte eines Anbieter-SDKs. Der Dispatcher nimmt bereits dekodierte Argumente als Objekt entgegen. Er liefert `{ ok: true, tool, data }` oder `{ ok: false, tool, error: { code, message } }`. Unbekannte Tools, zusätzliche Felder, nicht unterstützte Sprachen und ungültige Auswahlen führen zu strukturierten Fehlern. Der angeforderte Prüfumfang wird nicht stillschweigend verändert.

Die Anwendung legt Zielgruppe und Ziel beim Erstellen des Dispatchers fest. Ein Tool-Aufruf kann diese Werte weder ersetzen noch einen Callback registrieren, einen Endpunkt konfigurieren oder Quelltext ausführen. Rohe Dokumente bleiben nicht vertrauenswürdiges Prüfmaterial. Das Paket benötigt weder Netzwerk- oder Dateisystemzugriff noch Zugangsdaten, Anbieter-SDKs oder eine Modellausführung.

## Eingaben und Ergebnisse der Tools

| Tool | Eingaben | Ergebnis |
| --- | --- | --- |
| `get_writing_rules` | Optional: `profile`, `ruleIds`, `language`, `detail` | Standardmäßig eine kurze Regelliste. `detail: "full"` liefert vollständige Regeln, übersetzte Prompts und Beispiele, Ausnahmen und die Quellenbelege aus dem Katalog. |
| `compose_writing_review_prompt` | Optional: `profile`, `ruleIds`, `language`, `maxFindings` | Kanonischer Prompt-Text, ausgewählte Regel-IDs und Katalogversion. Zielgruppe und Ziel müssen von der Anwendung vorgegeben sein. Standardmäßig werden die sechs Regeln für öffentliche Dokumentation verwendet. |
| `find_writing_signals` | Erforderlich: `text`; optional: `profile`, `ruleIds`, `language`, `maxSignals` | Trefferkandidaten der veröffentlichten regulären Ausdrücke mit zitierten UTF-16-Bereichen, geprüften und nicht geprüften Regeln sowie Angabe einer Kürzung. |
| `get_model_comparison_evidence` | Erforderlich: `language`, `profile`, `role: "reviewer"`, `cohortId` | Von der Anwendung bereitgestellte Nachweise für genau diesen Prüfumfang oder `evidence-missing`. |

Unterstützte Sprachen sind `en` und `de`. Ohne Sprachangabe verwenden die ersten drei Tools Englisch. Verfügbare Profile sind `public-docs`, `technical-reference`, `product-copy` und `agent-report`. Explizit angegebene Regel-IDs müssen zum ausgewählten Profil gehören. Leere ID-Arrays und doppelte IDs werden abgelehnt.

`maxFindings` erlaubt Werte von 1 bis 20; der Standardwert ist fünf. Das Feld fordert ein Antwortformat an, begrenzt aber nicht die Modellausführung. `maxSignals` erlaubt 1 bis 500 und verwendet standardmäßig 50. Eingabetext darf höchstens 250.000 UTF-16-Codeeinheiten umfassen. Bei Zeichen außerhalb der Basic Multilingual Plane können die Zeichenlänge nach JSON Schema und die UTF-16-Länge in JavaScript voneinander abweichen. Die Laufzeitprüfung setzt das UTF-16-Limit durch.

```ts
const knowledge = await dispatcher.dispatch({
  name: 'get_writing_rules',
  arguments: { ruleIds: ['reader-goal', 'word-choice'], detail: 'full' },
});

const instructions = await dispatcher.dispatch({
  name: 'compose_writing_review_prompt',
  arguments: { profile: 'public-docs', language: 'en', maxFindings: 3 },
});
```

Vollständiges Regelwissen enthält die zweisprachigen Katalogeinträge. `language` bestimmt die Sprache der zusammengefassten Titel sowie die Prompt- und Scanner-Sprache. Der Composer nimmt die ausgewählten Anweisungen und Beispiele mit ihren Anwendungsbedingungen auf. Er hängt weder Forschungsartikel noch sämtliche Metadatenfelder des Katalogs an. Ein neuer Artikel auf der Website aktualisiert das Regelwissen des Pakets nicht automatisch.

## Nachweise zur Modellqualität lesen

Die Anwendung stellt verfügbare Modell-IDs, erlaubte Kohorten-IDs und einen ausschließlich lesenden Callback für Nachweise bereit. Diese Werte stammen aus der Anwendungskonfiguration und ihrem Modellkatalog. Der Tool-Aufruf übergibt nur den gewünschten Prüfumfang.

```ts
import {
  createWritingToolDispatcher,
  type ModelComparisonEvidence,
} from '@voice/writing-rules/tools';

const evidenceTools = createWritingToolDispatcher({
  modelComparisonContext: {
    availableModelIds: ['model-id-resolved-by-the-host'],
    cohortIds: ['public-docs-held-out-v1'],
  },
  getModelComparisonEvidence: async (query, context) => {
    // A host can read retained, independently reviewed benchmark results here.
    // This example deliberately has no measured comparison to return.
    const result: ModelComparisonEvidence = {
      status: 'evidence-missing',
      query,
      bestValue: null,
      highestDetection: null,
      sources: [],
      explanation: 'No independently reviewed comparison is available for this scope.',
      limitations: [
        'The authored pilot and researched token prices do not qualify a model.',
      ],
    };
    return result;
  },
});

const evidence = await evidenceTools.dispatch({
  name: 'get_model_comparison_evidence',
  arguments: {
    language: 'en',
    profile: 'public-docs',
    role: 'reviewer',
    cohortId: 'public-docs-held-out-v1',
  },
});
```

Der Callback darf gespeicherte Nachweise lesen. Er darf weder eine Modellausführung starten noch eine Route ändern oder Zustand schreiben. Die Library selbst führt keine solchen Aufrufe aus; beliebiger Callback-Code der Anwendung lässt sich durch sie jedoch nicht abschirmen. Abfrage und Kontext werden als unveränderliche Kopien festgehalten. Spätere Änderungen an den Eingabe-Arrays der Anwendung verändern den Dispatcher nicht.

Ein verfügbarer Vergleich enthält `bestValue`, `highestDetection` oder beides. Jede Auswahl nennt die Modell-ID der Anwendung, Quellen-IDs, die Kennzeichnung unabhängiger Beurteilung, die Anzahl geplanter, beurteilter und akzeptierter vollständiger Reviews, Erkennungszahlen, die Anzahl falscher Änderungsvorschläge, Kosten sämtlicher Versuche und Einschränkungen. Quelldatensätze enthalten einen Speicherort und SHA-256. Speicherorte werden als Daten zurückgegeben; der Adapter ruft sie nicht ab.

- `bestValue` setzt unabhängig beurteilte Reviews, mindestens ein akzeptiertes vollständiges Review und bekannte Kosten einschließlich fehlgeschlagener und wiederholter Versuche voraus.
- `highestDetection` verlangt unabhängige Urteile zu einzelnen Problemen: Anzahlen erkannter und erwarteter Probleme sowie falscher Änderungsvorschläge. Übereinstimmung mit wenigen Testfall-Labels reicht dafür nicht aus.
- Unbekannte Messwerte bleiben `null`. Ein Vergleich kann das Preis-Leistungs-Verhältnis belegen, während Nachweise zur Erkennungsleistung fehlen.

Die Anwendung erklärt ihre Qualitätskriterien und die Grenzen des Vergleichs. Eine Auswahl muss auf übereinstimmendem Prüfumfang, unterstützten Modelleinstellungen und reproduzierbaren Berichten beruhen. Der Adapter prüft Struktur, Quellenverweise, verfügbare IDs, Anzahlen sowie die genaue Übereinstimmung von Sprache, Profil, Rolle und Kohorte. Er prüft nicht den Inhalt der Berichte und berechnet kein optimales Modell. Eine Anwendung kann bestehende Token-Economy-Verträge zur Modellauflösung und für Kostennachweise verwenden. Dieses Paket stellt keinen Ersatz für das Routing bereit.

Fehlen Callback oder Kontext, lautet das Ergebnis `evidence-missing` mit `null` für die Modellauswahl. Ein fehlgeschlagener Callback liefert `host-evidence-failed`; eine fehlerhafte oder nicht passende Antwort liefert `invalid-host-evidence`. In keinem dieser Fälle wird ein anderes Modell oder eine andere Sprache eingesetzt.

## Ergebnisse vor der Verwendung prüfen

Der statische Scanner erkennt Muster für acht Regeln anhand von sechzehn EN/DE-Regex-Einträgen. Er schließt Code, Zitate oder Verneinungen nicht aus und beurteilt weder Bedeutung noch Faktenbelege, Seitenstruktur oder Urheberschaft. Jeder Treffer muss geprüft werden.

Das Prompt-Tool bereitet Anweisungen vor. Die Anwendung entscheidet über deren Übermittlung und validiert jedes zurückgegebene Urteil. Sie ordnet auch Quelltextbereiche zu, erhält Entscheidungen der Autorinnen und Autoren und übergibt Befunde bei Bedarf an `@voice/review` zur Darstellung in HTML. Die Ausführung eines Tools allein verändert kein Dokument.

Die lokalen Tests für den Adaptervertrag lassen sich so ausführen:

```sh
npm --prefix packages/writing-rules test
```

Diese Tests führen synthetische Tool-Aufrufe aus und prüfen die tatsächlichen Katalog-, Prompt- und Regex-Ergebnisse. Nachweis-Testdaten decken fehlende oder ungültige Daten und die Begrenzung auf Lesezugriffe ab. Sie messen weder Modellqualität noch Preise oder Ausführungsdauer.
