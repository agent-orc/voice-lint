# Semantische Reviews und Quelltextaufgaben mit CodingAgentRunner

Voice Studio verwendet die .NET-Bibliothek `CodingAgentRunner` für semantische Reviews ganzer Dateien und für gespeicherte Verbesserungsaufgaben. Sie startet die konfigurierte Coding-Agent-CLI mit deren bestehender Anmeldung. Konfiguriere vor einem solchen Lauf die Route auf dem Server.

## Abhängigkeit

Lege die Version des portablen NuGet-Pakets in `VoiceStudio.Api.csproj` fest:

```xml
<PackageReference Include="CodingAgentRunner" Version="0.7.0" />
```

Stelle die Abhängigkeiten mit `dotnet restore` wieder her und baue mit `dotnet build`. Das festgelegte Paket enthält die vom Adapter genutzten APIs für Streaming, Berechtigungen und isolierten CLI-Kontext. Ein externer Quelltext-Checkout ist nicht erforderlich.

## Serverkonfiguration

Konfiguriere vor dem Serverstart alle drei Werte:

```sh
export VOICE_REVIEW_CLI=codex
export VOICE_REVIEW_MODEL=gpt-5.6-sol
export VOICE_REVIEW_THINKING=medium
```

Die Beispielroute ist vorläufig. Wähle ein Modell und eine Denkstufe, die von der installierten CLI und der festgelegten Runner-Version unterstützt werden. Als weitere CLI-Auswahl wird `claude` unterstützt. Die Route stammt aus dieser Serverkonfiguration; es gibt weder eine Zulassungsprüfung durch Token Economy noch einen automatischen Modellwechsel. `VOICE_REVIEW_CLI_PATH` kann optional die vertrauenswürdige lokale CLI-Programmdatei festlegen. `VOICE_REVIEW_TIMEOUT_SECONDS` begrenzt die Laufzeit auf 15–1.800 Sekunden; der Standardwert ist 300. Anfrageinhalte dürfen weder CLI-Pfad, Modellendpunkt, Zugangsdaten, Berechtigungsumgehung noch Modellroute vorgeben.

Die konfigurierte CLI muss bereits installiert und angemeldet sein. Der Statusaufruf verwendet nur die Runner-Prüfungen für Version und vorhandene Zugangsdaten. Vorhandene Zugangsdaten belegen keine weiterhin gültige Sitzung. Die statische Erkennung von Fähigkeiten ist weder ein aktueller Verfügbarkeitstest noch ein Benchmark der Voice-Review-Qualität. Statusanfragen warten höchstens zehn Sekunden. Eine noch laufende Prüfung wird weiter gemeinsam genutzt; wiederholte Abfragen können deshalb keine parallelen Versionsprüfungen im Hintergrund erzeugen. Ein Status-Timeout startet niemals einen Modellaufruf.

## Backend-Vertrag

`RunnerReviewService` stellt folgende Methoden bereit:

- `GetStatusAsync(ct)`: konfigurierte und verfügbare Route, Nur-Lese-Modus und isolierter CLI-Kontext, vorläufige Eignung, Begründung und Laufzeitgrenze. Kein Modellaufruf.
- `StartAsync(projectId, documentId, SemanticReviewInput, ct)`: prüft die Quelltextversion, bereitet ein Review der gesamten Datei vor und liefert dessen gespeicherten Datensatz im Status „laufend“. Nur eine ausdrückliche Bedienaktion sollte diese Methode aufrufen.
- `GetRun(projectId, documentId, runId)`: liefert das dauerhaft gespeicherte aktuelle Ergebnis.
- `ListRuns(projectId, documentId)`: liefert die neuesten 100 gespeicherten Läufe dieser Datei und prüft abgeschlossene Nachweise erneut gegen den aktuellen Quelltext und zugehörigen Kontext.
- `Cancel(projectId, documentId, runId)`: bricht einen laufenden Prozess über Runner ab.

Die Starteingabe enthält `expectedVersion`, eine idempotente `requestId` und optional eine `instruction`. Der Host stellt authentifizierte Endpunkte und die ausdrückliche Startschaltfläche in Studio bereit. Automatisches Laden eines Dokuments startet keinen Modellaufruf.

`ImprovementTaskService` stellt einen getrennten, dauerhaft gespeicherten Ablauf unter `/api/projects/{projectId}/documents/{documentId}/tasks` bereit: Auflisten und Erstellen, Abrufen, `/{id}/prompt` sowie die ausdrücklichen Aktionen `/{id}/start`, `/{id}/cancel`, `/{id}/apply` und `/{id}/resolve`. Eine Aufgabe speichert Anweisung, ausgewählte Feedback-IDs, Quelltextversion, Feedback-Revision, Fingerprint des Komponentenkontexts und Revision. Sowohl Erstellung als auch Start benötigen eine idempotente Anforderungs-ID. Geänderte Eingaben unter derselben ID werden abgewiesen.

Das Speichern oder Kopieren des vorbereiteten Prompts startet keinen Modellaufruf. Beim Start wird derselbe Runner-Adapter im Aufgabenmodus aufgerufen. Nach den Fähigkeitsprüfungen werden Quelltext, Feedback und Kontext nochmals geprüft, bevor der Start dauerhaft beansprucht wird. Eine langsame Fähigkeitsprüfung kann so keine inzwischen veraltete Aufgabe unbemerkt starten. Anfragen dürfen kein beliebiges Modell, Programm oder Schreibrecht auswählen.

Ein Lauf speichert konfigurierte CLI, Modell und Denkstufe, das gegebenenfalls von der CLI gemeldete tatsächlich verwendete Modell, Quelltextversion, Kontextmanifest, Zeitstempel, Status, beratende Befunde mit Belegen, Hinweise, Nutzungsübersichten und Fehler. Meldet die CLI das tatsächliche Modell nicht, bleibt es unbekannt. Aus fehlenden Nutzungsdaten oder dem prozentualen Verbrauch eines Abonnementkontingents werden keine Kosten erfunden.

## Kontext und Quelltextintegrität

Das Hauptdokument wird vollständig mit jeder unterstützten Texteinheit und ihren exakten UTF-16-Koordinaten übergeben. Bei Markdown ist dies die ausgewählte Datei. Ein Ordnerbericht bleibt eine gesonderte Zusammenfassung und löst keinen impliziten Modellaufruf für den ganzen Ordner aus. Angular-Komponentenkontext stammt aus der expliziten `sourceContexts`-Zuordnung des Projekts, bereitgestellt durch `ProjectStore.GetReviewRunContext`. Zugehörige Vorlagen, Komponentencode und Stile erklären die Rolle des Texts in der gerenderten Seite. Sie sind keine zusätzlichen Quelltextziele für modellgenerierte Befunde.

Der Quelltextadapter weist Kürzungen zugehöriger Dateien aus; das Kontextmanifest hält sie fest. Überschreitet die serialisierte vollständige Anfrage die konfigurierte Kontextgrenze von standardmäßig 200.000 Zeichen, wird der Lauf vor dem Modellaufruf abgewiesen. Die Eingabe wird nicht stillschweigend auf den sichtbaren Ausschnitt reduziert. Diese Zeichengrenze ist keine Token-Schätzung. Die Hauptdatei wird nie stillschweigend gekürzt.

Der Host legt `review-context.json` in seinem eigenen Arbeitsverzeichnis für den jeweiligen Lauf ab und initialisiert dieses temporäre Verzeichnis zur CLI-Kompatibilität mit `git init`. Der ursprüngliche Quelltext-Checkout dient nicht als Arbeitsverzeichnis des Agenten. Runner läuft ausdrücklich mit `CliPermissionModes.ReadOnly` und isoliertem CLI-Kontext. Delegation, automatisches Warten auf Kontingente und automatische Wiederholungen sind deaktiviert. Der isolierte Kontext trennt CLI-Zustände; er ist keine allgemeine Dateisystem- oder Netzwerk-Sandbox. Bei Claude wird der Nur-Lese-Modus auf den Plan-Modus abgebildet, bei Codex auf dessen native Nur-Lese-Sandbox.

Laufzeit- und Ausgabegrenzen, Abbruch und der Runner-Watchdog stoppen ausufernde Läufe. Sie garantieren keine Token- oder Geldobergrenze. Die UI muss dies vor einem ausdrücklich gestarteten Lauf erläutern und die konfigurierte Route samt Unsicherheiten festhalten.

## Ausgabevalidierung und Speicherung

Der Prompt verlangt ein versioniertes JSON-Objekt mit der ursprünglichen Quelltextversion, allen geprüften Einheiten-IDs, Befunden und Hinweisen. Vor dem abschließenden JSON-Objekt darf eine kurze Einleitung stehen; es darf auch in einem JSON-Codeblock stehen. Das Backend prüft JSON-Struktur, exakte Quelltextversion, Abdeckung aller Einheiten der Datei, zulässige Kategorien, UTF-16-Bereiche ohne aufgetrennte Zeichen, exakte Zitate und erforderliche Belegtextfelder. Es prüft die sachliche oder semantische Grundlage nicht unabhängig. Die Abdeckungsliste ist eine Erklärung des Modells zu den übergebenen Einheiten. Sie ist kein unabhängiger Nachweis semantischer Korrektheit und erfasst keine vom Parser ausgeschlossenen Bereiche.

Ein fehlgeschlagener Prozessabschluss, Abbruch, fehlendes Abschlussereignis, fehlerhafte Ausgabe oder veralteter Quelltext beziehungsweise Kontext kann nicht zu einem abgeschlossenen, akzeptierten Review führen. Vor der Annahme von Befunden werden der Quelltext und jeder übergebene Snapshot des Komponentenkontexts erneut geprüft. Die Befunde sind beratend und werden getrennt von deterministischen Regeln zurückgegeben. Vorschläge aus einem gewöhnlichen semantischen Review erzeugen oder übernehmen nicht automatisch einen Quelltextvorschlag. Eine ausdrücklich gestartete Verbesserungsaufgabe kann einen validierten kombinierten Vorschlag vorbereiten. Kein Runner-Ablauf übernimmt ihn in die Datei.

Jede Anfrage besitzt eine dauerhaft gespeicherte Zuordnung und einen Laufdatensatz unter `.voice-lint/semantic-runs/<runId>/`, mit `input.json`, `run.json` und `output.txt`. Identische Wiederholungen liefern den vorhandenen Lauf; geänderte Eingaben unter derselben Anforderungs-ID werden abgewiesen. Ein nach einem Neustart verbliebener laufender Datensatz wird als unterbrochen markiert und nicht automatisch neu gestartet. Unverarbeitete Runner-Protokolle und das vorbereitete Arbeitsverzeichnis bleiben im konfigurierten Laufzeitverzeichnis des Hosts. Diese Dateien enthalten geprüfte Inhalte. Verwende dafür die bestehende lokale Aufbewahrungsregel des Projekts.

## Aufgabenergebnisse und kombinierte Vorschläge

Der Aufgabenmodus ergänzt zwei erforderliche Ausgabefelder: `taskDisposition` und `taskExplanation`. Die Erklärung muss einen konkreten Grund nennen, der sich auf Anfrage und übergebenen Kontext stützt. Für den Abschlussgrund ist einer dieser Werte vorgesehen:

- `changes`: Mindestens ein unterstützter Ersetzungsvorschlag liegt vor.
- `already_satisfied`: Es bleiben weder Ersetzungen noch offene Befunde. Die Aufgabe kann als `completed` mit der Auflösung `agent_no_changes` geschlossen werden.
- `needs_information`: Erforderliche Fakten fehlen. Die Aufgabe erhält den Status `needs_review`.
- `unsupported`: Die Anfrage erfordert strukturelle, dateiübergreifende oder nicht unterstützte Quelltextoperationen. Die Aufgabe erhält den Status `needs_review`.

Ein erfolgreicher CLI-Abschluss ohne Ersetzungen reicht nicht aus, um eine Aufgabe zu schließen. Fehlende oder widersprüchliche Abschlussfelder bestehen die Validierung nicht. Die Begründung des Modells bleibt prüfbar; der JSON-Validator bestätigt ihre Richtigkeit nicht unabhängig. Der Status `needs_review` bewahrt die Erklärung zum offenen Problem, ohne eine Korrektur zu erfinden.

Eine Aufgabe mit `changes` kann 1–50 nicht überlappende Änderungen an unterstützten Texteinheiten **innerhalb der ausgewählten Datei** vorbereiten. `ProjectStore.CreateTaskProposal` prüft erneut Quelltextversion, Feedback-Revision und den konfigurierten Fingerprint des Komponentenkontexts. Die Methode validiert Zitate und sichere Zuordnungen, erhält die HTML-, Markdown- oder TypeScript-Syntax über den Quelltextadapter und erzeugt einen vollständigen Vorher-Nachher-Vorschlag. Überlappungen, unsichere Quelltextgrenzen und ungültiges TypeScript führen zur Ablehnung des gesamten Satzes; es werden keine Teiländerungen übernommen. Zugehörige Kontextdateien sind niemals Schreibziele.

Der Vorschlag versetzt die Aufgabe in `ready`. Nur der separate Übernahme-Endpunkt der Aufgabe kann ihn mit aktueller Aufgabenrevision, Quelltextversion und Feedback-Revision schreiben. Er prüft den Komponentenkontext erneut und verwendet die bestehende Sicherung und das Transaktionsjournal. Der gewöhnliche Vorschlagsendpunkt kann die Prüfungen der zugehörigen Aufgabe nicht umgehen. Nach einem Absturz im Anschluss an die Quelltexttransaktion wird der Zustand aus dem übernommenen Vorschlag wiederhergestellt; der Schreibvorgang wird nicht wiederholt. Übernommene Aufgaben bleiben historische Ergebnisse.

Aufgabendatensätze liegen unter `.voice-lint/tasks/<documentId>/<taskId>.json` und verknüpfen Runner-Lauf und Vorschlag. Wiederholte Starts lösen keinen weiteren Lauf aus. Fehlgeschlagene oder unterbrochene Datensätze starten beim Seitenladen nicht erneut. Ein Abbruch lässt den Quelltext unverändert. Eine manuelle Auflösung ist eine eigene ausdrückliche Aktion mit erforderlicher Begründung und aktuellem Quelltext- und Feedback-Stand.

## Lokale Build- und Testprüfung

Starte nach der Übernahme eines Vorschlags ausdrücklich die konfigurierte lokale Projektprüfung in Studio. `ProjectCheckService` führt den vom Host konfigurierten Build- oder Testbefehl aus und speichert Protokolle, Exit-Code und Quelltext-Fingerprint. Ergebnisse erhalten den Status `stale`, wenn sich die konfigurierten Eingaben oder das Befehlsprofil ändern.

Dieser Prozess läuft mit den Rechten des Host-Benutzers außerhalb des Nur-Lese-Modus des semantischen Runners. Fehlende Voraussetzungen verhindern den Start. Die Quelltextübernahme startet keine Prüfung. Unter [lokale Projektprüfungen](../backend/CHECKS.md) findest du die Konfiguration von Befehl und Eingabeumfang sowie die Prüf-API.

## Verifikation

```sh
dotnet run --project backend/VoiceStudio.RunnerTests/VoiceStudio.RunnerTests.csproj
dotnet run --project backend/VoiceStudio.TaskTests/VoiceStudio.TaskTests.csproj
npm run test:checks
```

Die Tests injizieren `IVoiceReviewRunner`. Sie prüfen die exakte Ausgabevalidierung, Anfragen mit Nur-Lese-Rechten und isoliertem Kontext, vorbereiteten Kontext, Speicherung, Idempotenz, fehlgeschlagene oder fehlende Abschlussereignisse, Ablehnung veralteten Quelltexts und Abbruch, ohne einen Coding-Agent-Modelllauf zu starten. Die Aufgabentests prüfen zusätzlich den Lebenszyklus gespeicherter Aufgaben, Kontextänderungen, Abschlussgründe, kombinierte Vorschläge und die gesonderte Freigabe zur Übernahme. Die getrennten Projektprüfungstests verwenden simulierte Prozesse und kleine ausführbare Testdateien für Status, Speicherung, Quelltextänderungen, Protokolle und den Abbruch von Prozessbäumen. Dabei läuft weder ein Modell noch ein Build der Zielwebsite.
Diese Tests prüfen keine aktuelle CLI-Anmeldung und keine redaktionelle Qualität. Teste die konfigurierte Route mit einem ausdrücklich gestarteten Review und prüfe dessen Befunde, bevor du die Ausgabe für Quelltextänderungen verwendest.

Die vier lokalen Regeln ohne LLM und ihr Wiki verwenden `knowledge/rules.json`. Evaluierte Adapter für LanguageTool, Vale, CSpell, Hunspell und textlint gehören nicht zu Runner und sind keine installierten Analyzer. [Sprachwerkzeuge](language-tooling.md), [Drittanbieterhinweise](../THIRD_PARTY_NOTICES.md) und das aufgelöste npm-Inventar unterscheiden die tatsächlich eingesetzten Pakete von möglichen Engines und Datenquellen.
