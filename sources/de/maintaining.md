# Produktdateien und Prüfnachweise

## Dateiablage

| Ort | Zweck |
| --- | --- |
| `frontend/`, `backend/`, `packages/` | Anwendung, Quelltextadapter, Verträge und wiederverwendbare Review-Library. |
| `knowledge/`, `examples/` | Regelerklärungen und gepflegte Integrations- und Beispielquellen. |
| `website/` | Statische Produktwebsite und Dokumentationsrenderer; veröffentlicht wird die gebaute Ausgabe. |
| `scripts/` | Befehle für Build, Betrieb und Verifikation. |
| `benchmarks/writing-review/` | Verfasste englische und deutsche Testfälle, Offline-Vergleichsrunner und Ablage geprüfter Ergebnisse. |
| `website/research/` | Gepflegte Zuordnung von Forschungsquellen zur API und aufbewahrte Messübersicht. |
| `docs/integrations/`, `scripts/integrations/` | Gepflegte Eingaben und Befehle für Integrationen mit externen Repositories. |
| `docs/verification/<date>/` | Ausgewählte Berichte und Nachweise für eine datierte Prüfaussage. |
| `test-results/`, `**/dist/`, `**/bin/`, `**/obj/` | Generierte Ausgabe; in Git ignoriert und aus dem Quelltext reproduzierbar. |
| `.local/`, `.voice-runtime/`, `.voice-studio/`, private Anwendungsdaten des Benutzers | Lokale Wartungs-, Registrierungs-, Sitzungs- und Laufzeitdaten; von der Veröffentlichung ausgeschlossen. |

Entscheidungen und Aufgaben eines geprüften Projekts liegen in dessen Ordner `.voice-lint/`. Die [Speicherreferenz](workflow.md#files-beside-the-source) zeigt den tatsächlichen Dateibaum und die JSON-Formate.

## Gepflegte Werkzeuge ausführen

Voraussetzungen, Eingaben und Ausgaben findest du im [Befehlskatalog](../scripts/README.md). Führe im Voice-Studio-Arbeitsverzeichnis aus:

```sh
npm run build
npm run website:build
npm run test:evidence
```

`test:evidence` prüft aufbewahrte Manifeste und Dateihashes. Die historischen Prüfungen werden dabei nicht erneut ausgeführt. Quelltext- und Aufgabenänderungen laufen über das Studio-Backend.

## Wiederverwendbare Nachweise aufbewahren

Wähle nach einem Prüflauf den Bericht und die Aufnahmen aus, die das Ergebnis belegen. Speichere sie in einem datierten Verzeichnis unter `docs/verification/`, zusammen mit Quelltextrevision oder Arbeitskopie-Snapshot, Aufnahmezeit, geprüftem Umfang und verbleibenden Lücken. Ergänze das Manifest um Bytegrößen und SHA-256-Hashes. Trenne Aufnahmezeit und Kopierzeit. Jeder neue Lauf erhält einen eigenen Datensatz und ersetzt keine frühere Beobachtung.

Unverarbeitete Ausgaben bleiben in `test-results/`. Entferne vor der Übernahme Zugangsdaten, unnötige Host-Pfade und rohe Anweisungen. Bewahre den Quelltext oder eine freigegebene Snapshot-Referenz auf, wenn Inhalte reproduzierbar bleiben müssen; Hashes allein sind keine Sicherungen. Die Website enthält nur die ausgewählten Dokumentquellen und Nachweise, deren Hashes mit dem Manifest übereinstimmen.

## Wiederverwendbare Befehle pflegen

Build- und Betriebsbefehle gehören nach `scripts/`, Benchmark-Runner und ihre Testfälle nach `benchmarks/`. Dokumentiere im Befehlskatalog die expliziten Eingaben, Nebenwirkungen, Ausgabeorte und das Verhalten bei Fehlern. Einmalige Patch- und Untersuchungsskripte bleiben im ignorierten lokalen Wartungsspeicher. Produktcode und unterstützte Befehle dürfen daraus nichts importieren.
