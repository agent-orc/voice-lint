# Benchmarks für Textreviews

Vergleiche Modelle und Prompt-Strategien anhand unabhängig beurteilter Ergebnisse. Halte fest, ob das Review Fakten und Absicht bewahrt, nachvollziehbare Entscheidungen trifft und relevante Probleme übersieht. Kosten sind eine eigene Messgröße: Ein Ergebnis lässt sich auch bewerten, wenn Nutzungsdaten des Anbieters oder abgerechnete Kosten fehlen.

Der Offline-Evaluator nimmt gespeicherte Modellantworten und menschliche Urteile entgegen. Er ruft kein Modell auf, startet keinen Agenten und wählt kein Modell für den Produktivbetrieb aus. Die enthaltenen 30 EN/DE-Fälle sind eigens erstellte Entwicklungsbeispiele. Sie helfen, das Bewertungsverfahren zu testen; sie bilden weder einen repräsentativen Qualitätsbenchmark noch einen für die abschließende Bewertung zurückgehaltenen Testsatz.

## Eingaben vorbereiten und festschreiben

Führe diese Befehle im Projektwurzelverzeichnis von Voice Studio aus:

```sh
npm run build:writing-rules
node benchmarks/writing-review/prepare-model-comparison.mjs
node benchmarks/writing-review/verify-model-comparison.mjs
node benchmarks/writing-review/evaluate-model-quality.mjs \
  --manifest test-results/writing-review/model-experiment.json \
  --init \
  --output test-results/writing-review/quality-run.json
```

Der letzte Befehl erstellt eine Vorlage für einen Messlauf, ohne ihn auszuführen. Sie hält den **Hash der exakten Manifestdatei**, den Evaluator-Hash, die Katalogversion und die ursprünglichen Hashes von Testfällen, Library, Forschungsdaten und Vorbereitungscode fest. Die Arrays für Bedingungen, Versuche und Reviews sind zunächst leer. Beim Erstellen der Vorlage werden keine Anfragen gesendet.

```text
benchmarks/writing-review/           maintained method and code
├── fixtures.json                    authored cases and reviewer-only labels
├── prepare-model-comparison.mjs     canonical requests and experiment manifest
├── evaluate-model-quality.mjs       response validation and offline evaluation
├── verify-model-quality.mjs         synthetic contract tests
└── quality-evaluation.md            evaluation method

test-results/writing-review/         generated records; ignored by Git
├── model-experiment.json            frozen prompts, sources and planned options
├── quality-run.json                 selected conditions, attempts and judgments
└── quality-report.json              deterministic evaluation of those inputs
```

Bewahre zu jedem veröffentlichten Ergebnis eine Kopie von Manifest, Laufdatei und Quellrevision auf. Überschreibe ein Manifest, auf das sich bereits ein Modelllauf bezieht, nicht durch erneute Vorbereitung. Eine geänderte Regel, Quelle, Modelleinstellung oder Evaluator-Version erfordert ein neues dokumentiertes Experiment oder eine ausdrücklich getrennte Neuauswertung. Der Evaluator lehnt ein Manifest bereits dann ab, wenn sich nur seine Formatierung und damit seine Bytes geändert haben.

## Den Vergleich vor der Antwortgenerierung festlegen

Jede Bedingung wählt eine festgeschriebene Kohorte mit definiertem Prüfumfang, eine Prompt-Strategie, genaue Quellen-IDs und Wiederholungsnummern aus. Sie hält außerdem angeforderte und zurückgegebene Modell-IDs, Anbieterparameter und Ausführungseinstellungen fest. Löse das Modell über die einbindende Anwendung auf; die recherchierten Kandidatennamen sind kein Routingkatalog.

Eine Bedingung hat folgenden Datenvertrag:

```json
{
  "conditionId": "profile-bundle-cold",
  "candidateId": "openai-luna",
  "cohortId": "public-docs-six",
  "strategyId": "bundled",
  "sourceIds": ["source-001", "source-002"],
  "repetitions": [1, 2],
  "provider": "recorded-provider-name",
  "requestedModelId": "recorded-requested-model-id",
  "effectiveModelId": "recorded-returned-model-version",
  "parameters": {"max_output_tokens": 1000},
  "parametersSha256": "SHA-256 of JSON.stringify(parameters)",
  "executionSettings": {
    "adapterVersion": "recorded-adapter-version",
    "runtimeVersion": "recorded-runtime-version",
    "reasoning": null,
    "maxOutputTokens": 1000,
    "concurrency": 1,
    "retryPolicy": {"maximumAttempts": 2},
    "cacheMode": "cold",
    "ordering": "counterbalanced",
    "orderSeed": "recorded-seed",
    "providerBatch": false
  }
}
```

Dies ist ein Feldbeispiel für das Array `conditions` der Vorlage. Ersetze beschreibende Platzhalter vor der Auswertung durch die tatsächlich aufgezeichneten Einstellungen und Hashes. Hashes erzeugst du mit der exportierten Funktion `sha256` aus `prepare-model-comparison.mjs`. Übernimm Quellen-IDs, Kandidaten-IDs, Strategien und Prüfumfang aus dem festgeschriebenen Manifest. `reasoning: null` bedeutet, dass keine Reasoning-Einstellung übergeben wurde; es bedeutet nicht, dass das Modell null Reasoning-Tokens verwendet hat.

Verwende bei den verglichenen Modellen und Prompt-Strategien dieselbe Quellenauswahl und dieselben Wiederholungen. Prüfumfänge mit sechs und zwanzig Regeln bleiben getrennt. Englische und deutsche Ergebnisse bleiben ebenfalls getrennt. Randomisiere die Reihenfolge der Generierung oder gleiche Reihenfolgeeffekte systematisch aus und dokumentiere das Verfahren. Behandle kalten Cache, warmen Cache, Anbieter-Batch und geänderte Parameter als eigene Bedingungen. Ein anderes Modell bei einem Wiederholungsversuch erfordert eine separat deklarierte Bedingung. Der Evaluator führt nicht deklarierte Eskalationsrouten nicht zusammen.

## Jeden Versuch speichern

Ein Versuch gehört zu einem geplanten Review mit der Kennung `conditionId/sourceId/r<repetition>` und zu einer festgeschriebenen Anfrage. Bewahre Fehlschläge und Wiederholungsversuche zusammen mit erfolgreichen Antworten auf. Jeder Versuch hat eine global eindeutige ID.

```json
{
  "attemptId": "attempt-001",
  "reviewRunId": "profile-bundle-cold/source-001/r1",
  "requestId": "source-001/public-docs-six/bundled/all",
  "sequence": 1,
  "retryOf": null,
  "requestedModelId": "recorded-requested-model-id",
  "effectiveModelId": "recorded-returned-model-version",
  "parametersSha256": "copy the condition parameter hash",
  "payloadSha256": "copy the frozen request payload hash",
  "canonicalPromptSha256": "copy the frozen canonical prompt hash",
  "sourceSha256": "copy the frozen source hash",
  "status": "response",
  "response": "the exact raw JSON response text",
  "error": null,
  "actualCostUsd": null,
  "usage": null,
  "latencyMs": null
}
```

Das Beispiel zeigt sämtliche Felder eines Versuchs; beschreibende Zeichenfolgen stehen für aufgezeichnete Werte. `response` akzeptiert JSON-Rohtext oder ein bereits geparstes JSON-Objekt. Bewahre den Rohtext auf, sofern er verfügbar ist – auch ungültiges JSON. Der Evaluator ruft für jede übergebene Antwort `validateModelResponse` auf. Ungültiges JSON, fehlende Regeln, veraltete Quellen, ungenaue zitierte Bereiche und nicht unterstützte Ergebnisstrukturen zählen als fehlgeschlagene Antworten. Sie verschwinden nicht aus dem Bericht.

Weitere Statuswerte für Versuche sind `error`, `cancelled` und `not-completed`. Ihr Feld `response` ist `null`. Wenn ein Versuch keine Modellantwort erhalten hat, darf auch die tatsächlich verwendete Modell-ID `null` sein. Ein Wiederholungsversuch verweist mit `retryOf` auf seinen Vorgänger und erhöht `sequence`. Änderungen an Quelle, Prompt, Parametern oder Modell innerhalb dieser Bedingung werden abgelehnt.

Wenn Nutzungsdaten verfügbar sind, enthält `usage` alle fünf Felder, die jeweils auch `null` sein dürfen: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens` und `reasoningTokens`. Fehlende Nutzungsdaten bleiben `null`. Trage die tatsächlichen Kosten aus der Kostenaufzeichnung der Anwendung ein. Der Evaluator macht aus recherchierten Preisschätzungen keine Rechnungsbeträge. Unbekannte Werte werden nicht durch lokale Kosten- oder Tokenschätzungen ersetzt.

## Den vollständigen Antwortsatz beurteilen

Lege **vor der menschlichen Bewertung** genau fest, welcher abschließende Versuch die Antwort zu jeder Anfrage liefert. Ein akzeptiertes vollständiges Review benötigt für jede Anfrage seines ausgewählten Regelumfangs eine gültige Antwort. Nicht ausgewählte Versuche bleiben im Lauf erhalten, damit ihre Kosten und Fehlerquoten sichtbar bleiben.

Erstelle einen Eintrag in `reviews` mit `reviewRunId`, `finalAttemptIds`, `humanJudgments` und `adjudication`. Binde jedes menschliche Urteil mit der vom Evaluator exportierten Funktion `responseSetSha256(finalAttemptIds, attempts)` an genau diese ausgewählten Antworten. Eine spätere Änderung an einer Antwort oder an der Auswahl macht die bisherigen Urteile ungültig.

Ein menschliches Urteil hat diese Struktur:

```json
{
  "reviewerId": "editor-01",
  "method": "independent-human-review",
  "responseSetSha256": "hash returned by responseSetSha256",
  "alternativeScope": "all-produced-alternatives",
  "factsPreserved": null,
  "intentPreserved": null,
  "harmfulChange": null,
  "ruleJudgments": [
    {
      "ruleId": "reader-goal",
      "decisionJustified": null,
      "missedIssueCount": null,
      "rationale": null
    }
  ],
  "rationale": null
}
```

Der Regeleintrag ist verkürzt dargestellt. Nimm für **jede ausgewählte Regel** genau ein Urteil auf und verwende dafür die `ruleIds` des festgeschriebenen Reviews. `null` bedeutet noch nicht beurteilt. Prüfende ersetzen diese Werte erst, nachdem sie die Originalquelle, den bereitgestellten Kontext, die Entscheidungen und **sämtliche ein bis drei vorgeschlagenen Alternativen** geprüft haben. Eine problematische Alternative zählt auch dann, wenn eine andere brauchbar ist. Beurteilte Regeln und abgeschlossene Reviews benötigen schriftliche Begründungen.

Beurteile diese Fragen unabhängig von den vorgegebenen Diagnose-Labels der Testfälle und vom Modellnamen:

| Urteil | Was geprüft wird |
| --- | --- |
| Fakten bewahrt | Bewahren sämtliche Alternativen und die angegebenen Gründe die belegten Fakten, ohne unbelegte Behauptungen hinzuzufügen? |
| Absicht bewahrt | Erhält das Review Zweck, Zielgruppe und beabsichtigte Bedeutung der Quelle? |
| Entscheidung begründet | Ist es für diese Regel und diesen Kontext angemessen, den Text beizubehalten, zu ändern oder Belege anzufordern? |
| Übersehene Probleme | Wie viele relevante Probleme dieser ausgewählten Regel hat die Antwort nicht behandelt? |
| Schädliche Änderung | Könnte eine vorgeschlagene Alternative die sachliche Richtigkeit, die Absicht oder die Handlungsfähigkeit der Lesenden beeinträchtigen? |

Ein nachvollziehbares `keep` kann als vollständiges Review akzeptiert werden. Ein begründetes `needs-evidence` kann redaktionell akzeptabel sein, während das Review unvollständig bleibt. Wenn ein Modell beispielsweise eine interne Aufräumgeschichte ersetzt, sollte es nach fehlenden aktuellen Pfaden fragen, statt diese zu erfinden.

Bewahre die Aufzeichnung jeder prüfenden Person auf. Abweichende, bereits abgegebene Urteile bleiben als Uneinigkeit sichtbar. Solange diese nicht geklärt ist, können sie ein Review nicht zur Annahme führen. Eine weitere Person kann unter `adjudication` ein abschließendes Urteil im selben Format abgeben. Die ursprünglichen Urteile und die Anzahl der Abweichungen bleiben im Ergebnis erhalten. Der Vertrag unterstützt auch ein einzelnes vollständiges menschliches Review; dieses belegt keine Übereinstimmung unabhängiger Prüfender.

Der Evaluator leitet die Annahme aus vollständigen und geklärten menschlichen Urteilen ab: Fakten und Absicht sind bewahrt, Entscheidungen begründet, im ausgewählten Umfang wurde kein Problem übersehen und keine Alternative ist schädlich. Ein passendes Testfall-Label ersetzt kein fehlendes menschliches Urteil. Der Bericht weist diese Dimensionen getrennt aus und erzeugt keinen Gesamtwert für die Schreibqualität.

## Auswerten und erneut auswerten

Nach dem Erfassen von Antworten und Urteilen:

```sh
node benchmarks/writing-review/evaluate-model-quality.mjs \
  --manifest test-results/writing-review/model-experiment.json \
  --run test-results/writing-review/quality-run.json \
  --output test-results/writing-review/quality-report.json

node --test benchmarks/writing-review/verify-model-quality.mjs
```

Der Evaluator baut das Manifest nie neu auf. Er prüft den Hash der Manifestbytes, die ursprünglichen Herkunftsnachweise, Evaluator-Version und Code-Hash, die Revision der Antwortvalidierung, Prompt- und Quellen-Hashes, genaue Modellidentitäten und die Parameter-Hashes der Bedingungen. Er überschreibt weder Eingabedateien noch einen vorhandenen Bericht. Wähle für eine erneute Auswertung einen neuen Ausgabedateinamen und verwende dieselben Eingabedateien und dieselbe dokumentierte Code-Revision. Für diese unveränderten Eingaben ist der Bericht identisch; er enthält keinen aktuellen Zeitstempel.

Eine Auswertung zu wiederholen ist etwas anderes, als neue Modellantworten zu erzeugen. Ein neuer Modelllauf kann selbst bei gleicher Anfrage und gleichen Einstellungen abweichen. Erfasse ihn als neuen Lauf oder neue Wiederholung, bewahre seine Ausgaben auf und vergleiche die Verteilung der Ergebnisse. Eine alte Antwort unter einer anderen Wiederholungsnummer wiederzuverwenden liefert keinen unabhängigen Nachweis.

Die Tests verwenden ausdrücklich als synthetisch gekennzeichnete Antworten und Prüfaufzeichnungen, um den Evaluator zu verifizieren. Ihr Bestehen belegt das Verhalten des Datenvertrags einschließlich der Fehlerbehandlung. Es misst nicht die redaktionelle Qualität eines Modells.

## Qualität und Kosten getrennt lesen

Der Bericht für jede Bedingung und Sprache behält alle geplanten Reviews als Bezugsgröße bei – auch fehlende, ungültige, unvollständige, unbeurteilte, strittige und abgelehnte. Er weist redaktionell akzeptierte Reviews getrennt von akzeptierten **vollständigen** Reviews aus. Hinzu kommen der Erhalt von Fakten und Absicht, schädliche Änderungen und menschliche Urteile auf Regelebene.

Der Diagnoseabschnitt vergleicht Vorhersagen mit den wenigen eigens vergebenen Testfall-Labels. Dazu müssen eine ausgewählte Regel-ID, das genaue Zitat und ein eindeutiger UTF-16-Bereich übereinstimmen. Überlappungen und unscharfe Übereinstimmungen zählen nicht. Ein längeres, aber nützliches Zitat kann diese Diagnose verfehlen und zugleich ein positives menschliches Urteil erhalten. Regeln ohne Label gelten nicht automatisch als richtige Beibehalten-Entscheidungen. Labels außerhalb des Prüfumfangs gehen nicht in den Recall ein. Neben diagnostischer Präzision und Recall enthält der Bericht die Anzahlen übereinstimmender, vorhergesagter und erwarteter Treffer. Ein leerer Nenner ergibt `null`.

Die Kosten pro akzeptiertem vollständigem Review ergeben sich aus den Kosten **aller übergebenen Versuche**, geteilt durch die Anzahl akzeptierter vollständiger Reviews. Fehler, ungültige Antworten, nicht ausgewählte Versuche und Wiederholungen zählen jeweils einmal. Sobald Kosten eines Versuchs unbekannt sind, bleiben Gesamtkosten und dieses Verhältnis unbekannt. Bei null akzeptierten vollständigen Reviews ist das Verhältnis ebenfalls `null`. Bekannte Teilkosten bleiben sichtbar. Qualität lässt sich weiterhin vergleichen, wenn Kosten fehlen.

Vergleiche nur übereinstimmende Quellensätze, Wiederholungen, Prüfumfänge und deklarierte Ausführungsbedingungen. Wähle kein Produktionsmodell anhand der dünn besetzten Testfall-Diagnosen aus. Verwende getrennt zurückgehaltene Produktdokumente, unabhängig geprüfte Problem-Labels und wiederholte Bedingungen, um zu ermitteln, was ein Modell im tatsächlichen Einsatz erkennt und bewahrt. Der aktuelle Evaluator berichtet Nachweise; eine ausdrückliche Strategie zur Modellauswahl legt die Anwendung fest.
