# Eine Datei in Studio prüfen

## Den ersten Review starten

Starte die Anwendung im ausgecheckten Voice-Studio-Repository:

```sh
npm start
# Open http://127.0.0.1:5188/
```

1. Gib den Kopplungscode ein, den das Backend ausgibt. Mit `npm run pairing-code` in einem zweiten Terminal kannst du ihn erneut anzeigen.
2. Öffne **Projekte und Dateien**, registriere deinen Quellordner und wähle eine Markdown- oder HTML-Datei aus.
3. Markiere eine zugeordnete Passage in der gerenderten Ansicht oder öffne einen Befund im Review-Panel.
4. Wähle **So beibehalten**, prüfe einen vorhandenen Vorschlag oder ergänze Feedback. Die Entscheidung zum Beibehalten speichert die Passage mit ihrer Quellversion.
5. Prüfe bei einer Ersetzung den Diff der Quelldatei und wähle **Anwenden**. Kontrolliere die geänderte Datei und die gerenderte Seite vor dem Commit.

Generierte Alternativen und semantische Aufgaben nutzen den konfigurierten Runner und müssen ausdrücklich gestartet werden. Das Lesen einer Datei und das Speichern einer Entscheidung rufen kein Modell auf.

Um eine laufende Anwendung zu prüfen, verbinde ihren Entwicklungsserver wie unten beschrieben. Die gespeicherten Datensätze erklären die [Dateiablage und JSON-Beispiele](#saved-tasks-and-decisions).

**Diesen Browser 7 Tage merken** erhält den Zugriff unter derselben Studio-Adresse. **Abmelden** widerruft ihn. Die [Browsersitzungen](browser-session.md) beschreiben Ablauf und HTTP-Vertrag.

## Angular-Anwendungen: die laufende Anwendung öffnen

Starte den Entwicklungsserver der Anwendung. Registriere ihr Projektverzeichnis und öffne ihre lokale URL in Voice Studio. Das iframe lädt die ursprüngliche Serverantwort mit Angular-Routing, Skripten, Assets und Browserzustand. Als Quelle dient weder eine nachgebaute Seite noch ein eingeschleuster Reverse-Proxy oder eine vorgerenderte Kopie.

Eine ausdrücklich aktivierte `@voice/review`-Bridge verbindet die lokale Seite mit Studio. Das übergeordnete Fenster prüft das genaue Fenster, den lokalen Origin und die Sitzung; Review-Nachrichten enthalten außerdem die Seiten-URL und Review-ID. Die Bridge überträgt keinen Bearer-Token von Studio. Das übergeordnete Fenster sendet Quelleinheiten und Review-Daten ausschließlich an den lokalen Entwicklungs-Origin, der für das registrierte Projekt konfiguriert ist. Entfernte Ziele werden abgewiesen.

`voice.config.json` beschreibt den Bezug zur Quelle:

```json
{
  "version": 1,
  "liveUrl": "http://127.0.0.1:4184/?voice-studio=1",
  "sourceFiles": ["src/app/content/*.ts"],
  "routes": {"/": "src/app/content/home.ts"},
  "sourceContexts": {
    "src/app/content/home.ts": [
      "src/app/page.component.ts",
      "src/app/page.component.html",
      "src/app/site-content.ts"
    ]
  }
}
```

Die Agent-Studio-Website ist auf diese Weise eingebunden: 27 Routen verweisen auf ihre ursprünglichen Inhaltsmodule und den gemeinsamen Angular-Renderer. Wenn du Text auf der tatsächlichen Seite auswählst, zeigt der Review die Inhaltsdatei, Quellzeile und zugehörigen Komponenten. Ein angenommener Textvorschlag ändert das ursprüngliche TypeScript-Stringliteral. Der anschließende Build und die Darstellung der Anwendung zeigen das Ergebnis.

Der TypeScript-Adapter nutzt den TypeScript-AST, ohne Website-Code auszuführen. Er extrahiert unterstützte Textliterale aus ausdrücklich einbezogenen Quelldateien; Importe, Code, technische Werte und Templates mit Interpolation bleiben ausgeschlossen. Ersetzungen erhalten die Maskierung von Anführungszeichen, Unicode und die umgebende TypeScript-Struktur. Die Syntax wird geprüft; Typprüfung und Build der Anwendung bleiben ein eigener Prüfschritt. Dynamischer Text und mehrdeutige DOM-Treffer werden nicht stillschweigend einer anderen Quelle zugeordnet. Eine konfigurierte Route benennt eine Datei, keinen vollständigen Abhängigkeitsgraphen. `sourceContexts` hält die bekannten relevanten Komponenten ausdrücklich fest.

Die Browserrichtlinien der Website gelten weiterhin. Eine lokale Anwendung, die das Einbetten in iframes verbietet, muss Studio als übergeordnetes Entwicklungsfenster zulassen oder in einem eigenen Tab geöffnet werden. Der eigene Tab ist eine normale Browseransicht und bedeutet nicht, dass ein Review-Panel verbunden ist. Produktionsbuilds sollten die Entwicklungs-Bridge nicht automatisch aktivieren.

## JSON-Inhalte und die Voice-Website

Ausdrücklich konfigurierte JSON-Dateien werden als Quelldokumente unterstützt. Der Adapter liest benannte Textfelder wie Titel, Einleitung, Methode, Einschränkungen und API-Erläuterungen. Er erhält UTF-16-Positionen auch bei maskierten Anführungszeichen und Unicode-Zeichen. Technische IDs, URLs und Markup bleiben ausgeschlossen. Doppelte Schlüssel und ungültiges JSON werden abgewiesen. Vorschläge erhalten die JSON-Stringmaskierung und die bestehenden Prüfungen der Quellversion; beim Anwenden wird die ursprüngliche Datei geschrieben.

Das Voice-Repository enthält eine eigene `voice.config.json`. So registrierst du es:

```sh
npm run website:preview
# In a second terminal:
npm start
# With both services running:
npm run onboard:website
```

Das Projekt öffnet die Studio-Produktseite. Ihre Überschrift und Einleitung stammen aus `website/content/studio.json`. Zum Projekt gehören außerdem die ursprünglichen Markdown-Dateien der 18 HTML-Anleitungen und die englischen und deutschen Research-Datensätze in JSON. Über die Verbindungsanzeige kannst du eine andere Research-Quelldatei auswählen. Eine Route wählt eine Quelldatei aus; nur exakt übereinstimmender sichtbarer Text erhält Markierungen. Per JavaScript erzeugte Seitenstrukturen und Texte aus mehreren Quelldateien werden keiner vermuteten Quelle zugeordnet.

Die lokale Website aktiviert ihre HTML-Review-Bridge auf der Loopback-Adresse mit `?voice-studio=1`. Beim normalen öffentlichen Seitenaufruf gibt es keine Bedienelemente für Analysen oder die Zusammenstellung von Prompts. Die Bridge überträgt Textauswahl und Befunde, ohne Zugangsdaten oder Modellausführung. Baue die statische Website nach einer JSON-Quelländerung mit `npm run website:build` neu und lade sie erneut, um das Ergebnis zu prüfen.

## Markdown: den Projektordner durchsuchen

Registriere einen Ordner, navigiere durch seine Unterordner und öffne eine Markdown-Datei. Die Quelle bleibt die Datei in diesem Ordner. Die gerenderte Ansicht unterstützt zugeordnete Textpassagen, Links, einfache Hervorhebungen und sichtbaren, von der Prüfung ausgeschlossenen Code. Dateiberichte erfassen alle unterstützten Einheiten einer Datei; Projektberichte fassen den registrierten Dateibestand zusammen.

Das Beispielhandbuch enthält die Ordner `guides/` und `checklists/`, an denen sich Ordnernavigation und relative Markdown-Links ausprobieren lassen. Die Markdown-Darstellung unterstützt einen Teilumfang von CommonMark. Die erzeugte Dokumentansicht läuft in einer Sandbox ohne Skripte; die oben beschriebene, ausdrücklich aktivierte Live-Anwendung läuft unter ihrem eigenen konfigurierten Entwicklungs-Origin. Ersetzungen über Markup-Grenzen hinweg werden abgewiesen, wenn der Quelladapter die Struktur nicht sicher erhalten kann.

## Review und Quelländerungen

1. Öffne die Anwendung oder den Ordner im üblichen Kontext.
2. Öffne lokale Befunde oder markiere eine unmarkierte, zugeordnete Passage.
3. Lies die Erklärung der Regel. Behalte die Formulierung bei oder vergleiche einen Vorschlag; Feedback ist optional.
4. Starte bei Bedarf einen semantischen Review der gesamten ausgewählten Datei.
5. Lass ausdrücklich Alternativen erzeugen, schreibe bei Bedarf selbst eine Ersetzung oder speichere eine Aufgabe mit Anweisung und ausgewähltem Feedback.
6. Starte die gespeicherte Aufgabe ausdrücklich über den Coding-Agent-Runner.
7. Lies das Ergebnis und prüfe einen gegebenenfalls vorliegenden vollständigen Quelldiff.
8. Wende den Vorschlag ausdrücklich an.
9. Starte die konfigurierte lokale Projektprüfung ausdrücklich, prüfe ihr Ergebnis und kontrolliere die laufende Anwendung.

Feedback, Aufgaben für Quelländerungen, Vorschläge und der Verlauf semantischer Läufe bleiben dem Projekt zugeordnet. Eine veraltete Quellversion lässt sich nicht überschreiben. Eine Quelländerung kann eine ältere Notiz oder ein semantisches Ergebnis veralten lassen; die Oberfläche kennzeichnet diesen Zustand. Vor dem Anwenden eines Vorschlags sichert das Backend die Quelle und protokolliert den ausstehenden Schreibvorgang in einem Transaktionsjournal.

## Lokale Projektprüfungen nach dem Anwenden

Im Panel für Projektprüfungen lässt sich der konfigurierte Build- oder Testbefehl gesondert starten. Das Angular-Pilotprojekt nutzt sein vorhandenes `npm run check`. Das Panel zeigt laufende oder abbrechende Prüfungen, begrenzte Logausgaben, den Exitcode und das Endergebnis: abgeschlossen, fehlgeschlagen oder abgebrochen. Ergebnisse werden mit dem konfigurierten Quellfingerprint gespeichert. Änderungen an der Quelle oder Prüfkonfiguration setzen sie auf `stale`; das ursprüngliche Ergebnis bleibt erhalten. Das Anwenden eines Vorschlags startet keine Prüfung automatisch und kennzeichnet kein früheres Ergebnis als aktuell.

Den festen Befehl und seine Eingaben legt ausschließlich eine private Host-Konfiguration außerhalb des Ziel-Repositorys fest. HTTP-Anfragen und `voice.config.json` können keine Programme oder Argumente vorgeben. Fehlende konfigurierte Abhängigkeiten verhindern den Start. Die Prüfung führt vertrauenswürdigen Projektcode mit den Rechten des Host-Benutzers aus, ohne Modell und ohne Sandbox-Garantie. Die Anleitung zu [lokalen Projektprüfungen](../backend/CHECKS.md) beschreibt Einrichtung, einbezogene Quellen und Prozessgrenzen. Auch nach einem erfolgreichen Build müssen die gerenderte Seite und ihre Texte geprüft werden.

## Gespeicherte Aufgaben und Entscheidungen

Beim Speichern einer Aufgabe werden ihre Anweisung, das ausgewählte Feedback, die Quellversion, die Feedback-Revision und der Fingerprint des konfigurierten Komponentenkontexts erfasst. Das Speichern ruft kein Modell auf. Der ausdrückliche Start ist idempotent: Wiederholungen derselben Anfrage starten keinen zweiten Runner-Lauf. Für einen neuen Versuch wird nach erneuter Prüfung von Quelle und Feedback eine neue Aufgabe angelegt.

| Ergebnis | Bedeutung | Nächster Schritt |
| --- | --- | --- |
| `queued` | Gespeichert, ohne Modellausführung | Anweisung und Kontext prüfen und ausdrücklich starten |
| `running` / `cancelling` | Ein Runner-Versuch läuft oder wird beendet | Beobachten oder abbrechen; die Quelle wird nicht geschrieben |
| `ready` | Ein validierter, zusammengefasster Änderungsvorschlag liegt vor | Den vollständigen Diff prüfen und ausdrücklich anwenden |
| `completed`, `agent_no_changes` | Der Agent hat ausdrücklich `already_satisfied` gemeldet, mit Begründung und ohne offene Befunde | Die Begründung prüfen; kein Text wurde geändert |
| `needs_review` | Erforderliche Fakten oder unterstützte Quelloperationen fehlen | Die Begründung lesen, Belege ergänzen oder eine umfassendere Aufgabe vorbereiten |
| `failed` / `cancelled` / `interrupted` / `stale` | Der Versuch kann keinen aktuellen erfolgreichen Vorschlag liefern | Das gespeicherte Ergebnis prüfen; kein automatischer Neustart |
| `applied` | Der gesondert freigegebene Vorschlag wurde geschrieben | Die tatsächliche Quelle und das gerenderte Ergebnis prüfen |

Ein Aufgabenvorschlag kann 1–50 unterstützte, nicht überlappende Textersetzungen in **einer ursprünglichen Datei** zusammenfassen. Jede Ersetzung bezieht sich auf dieselbe ursprüngliche Quellversion. Das Backend prüft exakte Zitate, Unicode und die Quellzuordnung und wendet anschließend den gesamten Satz auf einen Quellstand an. Überlappungen, unsichere Markup-Grenzen und nicht unterstützte Strukturänderungen werden abgewiesen; es wird kein Teilsatz angewendet. Eine zugehörige Angular-Komponente bleibt Kontext und wird nicht zum zusätzlichen Schreibziel.

Quelle, Feedback-Revision und Hashes des Komponentenkontexts werden rund um den Start sowie vor dem Erstellen und Anwenden eines Vorschlags erneut geprüft. Ein geänderter Kontext erfordert einen neuen Review. Eine gesonderte manuelle Erledigung braucht eine schriftliche Begründung sowie den aktuellen Quell- und Feedbackstand; die Oberfläche unterscheidet sie sichtbar von einer angewendeten Korrektur. Auch eine validierte Aussage `already_satisfied` bleibt das Urteil des Modells und ist kein unabhängiger Nachweis, dass die redaktionelle Aufgabe gelöst wurde.

### Dateien neben der Quelle

Aufgaben und Entscheidungen liegen derzeit im versteckten Ordner `.voice-lint/` des **registrierten Quellprojekts**. Das Projekt kann ein Git-Checkout oder ein gewöhnlicher Ordner sein. Die registrierte Wurzel kann auch in einem Unterordner eines größeren Repositorys liegen.

```text
<registered source project>/
  guide.md
  voice.config.json                         # optional route/source configuration
  .voice-lint/
    reviews/<document-id>.voice-meta.json    # feedback, decisions, proposals
    tasks/<document-id>/<task-id>.json       # task, prepared prompt, fingerprints
    semantic-runs/<run-id>/
      request.claim                         # duplicate-start protection
      input.json                            # staged source and related context
      run.json                              # state, findings/alternatives, usage
      output.txt                            # collected model output
    backups/<document-id>/<proposal-id>.md   # original source before apply
    transactions/<document-id>-<proposal-id>.json
```

Die Dateiendung der Sicherung folgt der Quelldatei: `.md`, `.html`, `.ts` usw. Entscheidungen zum Beibehalten stehen im Array `decisions` der Begleitdatei, Vorschläge in `proposals`. Es gibt keine einzelne Datei pro Entscheidung oder Vorschlag. Eine Aufgabe speichert ihren verknüpften Vorschlag zusätzlich in `task.proposal`.

| Aktion | Gespeicherte Änderung |
| --- | --- |
| Ein Dokument öffnen | Kann das Review-Verzeichnis anlegen. Vorhandene Metadaten können für die erneute Quellverankerung oder zur Wiederherstellung nach unterbrochenen Schreibvorgängen neu geschrieben werden. Ein unberührtes neues Dokument benötigt noch keine Begleitdatei. |
| Feedback speichern / So beibehalten | Die Review-Begleitdatei und ihre Revision anlegen oder aktualisieren. Keine Quelländerung und kein Modellaufruf. |
| Eine Aufgabe speichern | Ihre JSON-Datei mit `queued`, vorbereitetem Prompt und den aktuellen Fingerprints für Quelle, Review und Kontext anlegen. Kein Modellaufruf. |
| Ausdrücklich starten | Die Aufgabe um `runId` ergänzen; nach den Zulassungsprüfungen die Startsperre gegen Duplikate, Eingabe und den Datensatz des laufenden Versuchs anlegen. Scheitert die Zulassung vorher, kann eine fehlgeschlagene Aufgabe ohne Laufordner zurückbleiben. |
| Beenden oder abbrechen | Ergebnis und gesammelte Ausgabe des Laufs speichern. Eine erfolgreiche Aufgabe kann einen Vorschlag in der Begleitdatei vorbereiten und im Aufgabendatensatz behalten. Die Quelle bleibt unverändert. |
| Ausdrücklich anwenden | Die Sicherung der ursprünglichen Quelle und das ausstehende Transaktionsjournal schreiben, die geprüfte Quelländerung anwenden, Metadaten aktualisieren und das Journal als abgeschlossen markieren. |

### Gespeichertes JSON und seine Verweise

Die verlinkten Dateien sind **synthetische Beispiele des aktuellen Speicherformats**. Sie enthalten keine echten Nutzerdaten, API-Anfragen oder das geplante ganzheitliche Review-Schema. Die fiktive Quelle ist `guide.md` mit genau `Clear copy.\n`:

- [Vollständiges Aufgaben-JSON](examples/stored-source-task.example.json): eine Aufgabe mit Status `ready` und einem Vorschlag, der `copy` in `instructions` ändert. Der vorbereitete Prompt ist ausdrücklich als Platzhalter gekennzeichnet; kein Modell hat dieses Beispiel erzeugt.
- [Vollständiges JSON der Review-Begleitdatei](examples/stored-selection-decision.example.json): der frühere Stand der Begleitdatei nach dem Beibehalten von `Clear`, bevor ein Vorschlag vorliegt.

Die gespeicherte Aufgabe umschließt das API-Objekt `ImprovementTask`. Dieser Ausschnitt zeigt die Verknüpfungen; der Download enthält alle Felder:

```json
{
  "task": {
    "status": "ready",
    "documentId": "doc-dc0dbe13416a77d1",
    "id": "4354b61ec302dd4963c5264d0e313b25",
    "runId": "644e8e50d6185aee1c92635408fe1af8",
    "proposalId": "1edf21d420d5a71fa53e5a7395988f91"
  }
}
```

`documentId` verweist auf die Review-Begleitdatei, deren `documentPath` auf die Quelldatei zeigt. `runId` führt zu `semantic-runs/<run-id>/run.json`; dieser von der Aufgabe erzeugte Lauf verweist mit `taskId` zurück. `proposalId` wählt den Vorschlag in der Begleitdatei aus. Dessen `taskId` und `runId` müssen übereinstimmen. Der Vorschlag speichert `sourceBefore`, `sourceAfter`, die exakten zu ersetzenden Zitate und die zugeordneten Quellbereiche. Der gespeicherte Diff ist nicht der aktuelle Git-Diff.

Die umschließende Struktur speichert außerdem `prompt`, `creationFingerprint`, `contextFingerprint`, `startRequestId` und `startFingerprint`. Vor dem Start sind die Startfelder null. Fingerprints weisen geänderte Eingaben unter derselben Anfrage-ID ab und binden die Aufgabe an ihre Quelle, den Review und den Komponentenkontext. Dies sind Speicherfelder, keine zusätzlichen Eingaben der Aufgaben-API. Der aktuelle Backend-Serializer gibt JSON-Eigenschaftsnamen in camelCase aus und schließt Felder mit null ein.

| Kennung oder Version | Bedeutung |
| --- | --- |
| `project-<12 hex>` | Aus einem Hash des absoluten Registrierungspfads abgeleitet. Ein Umzug des Checkouts kann die Kennung ändern. Mitgelieferte Beispiele verwenden benannte IDs. |
| `doc-<16 hex>` | SHA-256-Präfix des projektrelativen Pfads mit Schrägstrichen. Eine Umbenennung ändert die Kennung, eine Textänderung nicht. |
| Aufgaben-, Lauf-, Vorschlags- und Entscheidungs-IDs | 32-stellige Kennungen, abgeleitet von Anfrage und zugehöriger Identität. Manuelle Vorschläge verwenden zufällige GUIDs. Keine dieser Kennungen ist ein Git-Commit. |
| `sourceVersion`, `expectedVersion` des Vorschlags | SHA-256 des dekodierten, als UTF-8 kodierten Quelltexts. Kein Git-SHA und nicht unbedingt der Hash der ursprünglichen Bytes einschließlich BOM. |
| `revision` der Begleitdatei / `reviewRevision` der Aufgabe | Zähler des Review-Zustands eines Dokuments. `revision` der Aufgabe ist ein gesonderter Zähler des Aufgabenzustands. |
| `unitsFingerprint`, `contextFingerprint` | Vom Backend erzeugte Hashes der serialisierten Quellzuordnung und des Kontexts; keine Benutzereinstellungen. |

Einträge zum Beibehalten speichern ihr Zitat, den UTF-16-Bereich innerhalb der Einheit und die ursprüngliche Quellversion. Änderungen an Quelle oder Zuordnung kennzeichnen sie als veraltet. Begleitdateien sowie Aufgaben- und Laufdateien sind veränderliche Betriebsdatensätze mit Revisionsprüfungen, kein ausschließlich ergänzbares Entscheidungsprotokoll. Das ältere Array `improvementRequests` ist vom aktuellen Aufgabenspeicher getrennt.

### Privater Speicher und Git

Die Studio-Installation hält das lokale Projektregister in `.voice-studio/projects.json` und einen Verweis auf die Zugangsdaten-Datei in `.voice-studio/session-location.json`. Zugangsdaten, gespeichertes Browservertrauen und temporäre CLI-Arbeit sind von den Datensätzen im Quellprojekt getrennt:

```text
<user LocalApplicationData>/VoiceStudio/sessions/<installation-hash>/
  session.json                            # private credentials
  trusted-browsers.json                    # hashed browser trust
  checks.json                             # host-owned check configuration
  runner/workspaces/<run-id>/
    review-context.json                   # CLI staging copy
    .git/                                 # scratch init, no source commit
```

**Studio committet, pusht und synchronisiert diese Datensätze nicht automatisch. Es ergänzt auch nicht die Ignore-Regeln eines Projekts um `.voice-lint/`.** Prüfe, was Git aufnehmen würde: Aufgaben und Läufe im Quellprojekt können vollständige Quellen, Prompts und Modellausgaben enthalten; Transaktionsjournale enthalten einen lokalen absoluten Sicherungspfad. Bewahre Quellen und zugehörige Metadaten samt Sicherungen gemeinsam auf. Ein Hash kann keinen Inhalt wiederherstellen, die Git-Historie der Quelle kann keine ignorierten Metadaten zurückholen, und die Sicherung eines Vorschlags deckt nur eine Datei ab. Das Journal erkennt unterbrochene Schreibvorgänge und verhindert, dass eine fremde Quellversion überschrieben wird. Ein Umzug des Checkouts kann außerdem eine nicht automatisierte Migration der Identitäten erfordern. Nutze Backend-Operationen, statt aktive Metadaten direkt zu bearbeiten. Halte Zugangsdaten und die Registerdateien der Installation privat.

Die Verzeichnisse `.voice-review/contexts/` und `.voice-review/reviews/` aus [holistic-review.md](holistic-review.md) beschreiben das **geplante** portable Git-Format, nicht den heutigen Speicher. Ein automatischer Export oder eine Migration in dieses Format ist nicht implementiert.

## Semantische Reviews als Runner-Aufgaben

Der implementierte Adapter nutzt `CodingAgentRunner` 0.7.0, kein direktes Modell-SDK. Nur die ausdrückliche Review-Aktion startet einen Lauf. Sie stellt die aktuelle Datei, zugeordnete Einheiten, Feedback und den begrenzten konfigurierten Komponentenkontext in einem eigenen Arbeitsverzeichnis bereit. Der Runner erhält nur Leserechte, einen frischen Kontext und keine Delegation. Befunde benötigen gültige Verweise auf Quellversion, Einheit, Zitat und UTF-16-Bereich sowie eine Begründung. Fehlgeschlagene, abgebrochene, unterbrochene und veraltete Läufe bleiben von abgeschlossenen Ergebnissen unterscheidbar. Fehlerhafte oder unvollständige Modellantworten bestehen die Validierung nicht.

Quelländerungen werden weiterhin über eine ausdrückliche Vorschlagsaktion des Backends angewendet. Gewöhnliche Befunde eines semantischen Reviews sind Hinweise und erzeugen keine Vorschläge automatisch. Eine ausdrücklich gestartete Verbesserungsaufgabe kann einen validierten, zusammengefassten Vorschlag vorbereiten. Dieser durchläuft denselben von Menschen geprüften Diff-Ablauf wie ein manueller Vorschlag. Eine syntaktisch gültige JSON-Antwort beweist weder Wahrheit noch redaktionelle Qualität. Qualifizierung, vergleichende Voice-Benchmarks und die Zulassung über Token Economy bleiben gesonderte Integrationsarbeit. Siehe [Runner-Integration](runner-integration.md) und [Modellstrategie](model-strategy.md).

## Prüfungen erklären und Review-Belege aufbewahren

Der lokale Prüfer und das Wiki laden denselben Katalog `knowledge/rules.json` mit vier Hinweisregeln, ihren Auslösern, Fragen, Beispielen und Grenzen. Das Wiki erklärt außerdem Quellzuordnung, Feedback, Modellwahl und mögliche Sprachwerkzeuge. LanguageTool, Vale, CSpell, Hunspell und textlint sind in dieser Preview keine integrierten Analysewerkzeuge. Die Seiten zu [Sprachwerkzeugen](language-tooling.md) und [Drittanbieterhinweisen](../THIRD_PARTY_NOTICES.md) erläutern die Trennung von Engine und Daten sowie das Verzeichnis mit 604 Einträgen aufgelöster npm-Metadaten.

Der [Review der Agent-Studio-Website](reviews/agent-studio-website-2026-09-06.md) umfasst alle 27 Routen und 30 Inhaltsdateien. Seine 36 Befunde halten exakte Zitate, Dateihashes, Belege und Entscheidungen in einer zugehörigen JSON-Datei fest. Importiere sie erst nach erneuter Prüfung der aktuellen Quelle. Fragen zur Übereinstimmung mit dem Release sind nicht automatisch falsche Behauptungen; Ersatztexte werden nicht automatisch angewendet.

Die ursprüngliche Dossier-Einleitung bleibt als Gegenbeispiel erhalten: Die lokale Regel-Engine meldet **null Befunde** für „Voice Lint concept revision“ und den Absatz „Research and analysis behind a sober public voice…“. Das bedeutet nur, dass keine implementierte feste Regel angeschlagen hat. Ein semantischer Review sollte die abstrakten internen Begriffe und die schwache Erklärung des Nutzens für Lesende aufgreifen.
