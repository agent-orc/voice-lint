# Lokale Projektprüfungen

Starte nach dem Übernehmen eines Quelltextvorschlags den konfigurierten lokalen Build- oder Testbefehl des Projekts und prüfe dessen Ergebnis. Die Prüfung läuft als eigener lokaler Prozess, ohne Modellaufruf oder Aufruf des Coding-Agent-Runners. Sie startet nur auf Anforderung.

Der Host legt pro exakt registriertem Projektverzeichnis einen festen Befehl fest. Die HTTP-API akzeptiert einen Quelltext-Fingerprint und einen Idempotenzschlüssel, aber keine ausführbare Datei, Argumente, Arbeitsverzeichnisse oder Umgebungsvariablen. `voice.config.json` enthält keine Befehlskonfiguration.

## Private Host-Konfiguration

Lies `.voice-studio/session-location.json`, um die Sitzungsdatei zu finden. Lege `checks.json` daneben im bestehenden, dem Benutzer gehörenden Sitzungsverzeichnis ab, außerhalb aller Zielprojekte. Die API liest diese Datei beim Start. Eine Profiländerung erfordert einen kontrollierten Neustart des Dienstes. Es gibt keinen HTTP-Endpunkt zum Erstellen oder Bearbeiten dieser Datei.

Für ein Angular-Projekt mit dem Skript `npm run check` kann ein Windows-Profil die absoluten Pfade zur Node-Datei und zum JavaScript-Einstieg der npm-CLI verwenden:

```json
{
  "version": 1,
  "profiles": [{
    "projectPath": "C:/path/to/website",
    "label": "npm run check",
    "executable": "C:/Program Files/nodejs/node.exe",
    "arguments": ["C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js", "run", "check"],
    "inputDirectories": ["src", "scripts", "public"],
    "inputFiles": [
      "package.json", "package-lock.json", "angular.json", "tsconfig.json",
      "tsconfig.app.json", "tsconfig.spec.json", "eslint.config.js",
      "stylelint.config.cjs", ".prettierrc", ".editorconfig"
    ],
    "requiredFiles": ["package.json", "package-lock.json", "node_modules/@angular/build/package.json"],
    "timeoutSeconds": 600
  }]
}
```

Trage die tatsächlich installierten Programmpfade des Hosts ein. `inputDirectories` und `inputFiles` enthalten feste relative Pfade ohne Globs; alle müssen vorhanden sein. Verzeichnisse werden rekursiv erfasst. Die Prüfung auf erforderliche Dateien wird unmittelbar vor dem Start wiederholt und nimmt diese Dateien in den Fingerprint auf. Die Abhängigkeitsdatei im Beispiel verhindert den Start, wenn das Angular-Build-Paket fehlt. Der Befehl führt dennoch vertrauenswürdigen Repository-Code mit den Rechten des Host-Benutzers aus. Repository-Skripte können Netzwerkanfragen, Paketoperationen oder andere Schreibzugriffe ausführen. Die Prüfung ist keine Prozess-Sandbox und garantiert keinen Offline-Betrieb.

Host-Konfiguration und ausführbare Datei müssen außerhalb des Zielprojekts liegen. Für Projektverzeichnisse, Konfigurationsdateien, ausführbare Dateien, Eingaben und gespeicherte Ergebnisse sind symbolische Links und Junctions nicht zulässig. Programmargumente werden über `ProcessStartInfo.ArgumentList` übergeben. Der Dienst leitet niemals einen Befehl aus Projektdateien ab.

## Quelltextbezug und Ergebnisse

Der Quelltext-Fingerprint umfasst relative Dateipfade und die vollständigen Dateibytes im konfigurierten Umfang, einschließlich Kennzeichen für fehlende Voraussetzungen. Der Konfigurations-Fingerprint erfasst das Host-Profil. Beide werden vor dem Start und nach dem Prozessende ermittelt. Auch ein späterer GET-Aufruf markiert frühere Ergebnisse als veraltet, wenn der erfasste Quelltext oder das Profil abweicht. Ein erfolgreicher Prozessabschluss erhält nur bei unverändertem konfiguriertem Quelltextumfang den Status `completed`. Geänderte oder nicht lesbare Eingaben führen zu `stale`; das ursprüngliche Ergebnis und der Exit-Code bleiben erhalten.

Dies ist ein optimistischer Vorher-Nachher-Vergleich, kein unveränderlicher Snapshot. Er erfasst weder jede installierte Abhängigkeit noch die gesamte Host-Umgebung. Build-Ausgaben außerhalb des konfigurierten Umfangs machen ein Ergebnis nicht ungültig. Wenn Build-Skripte zusätzliche Quelltext- oder Konfigurationspfade lesen, muss der Host den Eingabeumfang anpassen.

Mögliche Zustände sind `running`, `cancelling`, `completed`, `failed`, `cancelled` und `stale`. Ein Timeout führt zu `failed` mit einer ausdrücklichen Zeitüberschreitungsbegründung. Ein nach einem Neustart noch offener gespeicherter Lauf wird mit einer Unterbrechungsbegründung als `failed` markiert, oder als `stale`, wenn sich zusätzlich Quelltext oder Profil geändert haben. Er startet nie automatisch erneut. Ein Abbruch beendet den Prozessbaum und wartet auf das Prozessende. Ein abgeschlossener Lauf ändert weder die Aufgabenannahme noch Quelldateien, Git-Zustand oder den Status eines früheren Vorschlags.

Ergebnisse werden atomar in `.voice-lint/check-runs/<32-hex-run-id>.json` gespeichert. Sie enthalten Anforderungs-ID, Zeitstempel, geprüfte Fingerprints, Eingabegröße und Dateianzahl, Ergebnis, Exit-Code und eine begrenzte zusammengeführte Prozessausgabe. Beide Ausgabekanäle werden auch nach Erreichen der Speichergrenze weiter ausgelesen. Die Grenzen liegen bei 65.536 gespeicherten Protokollzeichen, 2.000 Eingabedateien, insgesamt 64 MiB Eingabedaten, 8 MiB pro Datei, einer Verzeichnistiefe von 20 und höchstens 1.200 Sekunden. Pro Voice-Studio-Dienst läuft jeweils eine Prüfung. Die API liefert die neuesten 50 Läufe. Nach 200 gespeicherten Läufen ist eine ausdrückliche Archivierung auf dem Host erforderlich; der Verlauf wird nie stillschweigend gelöscht.

## API

Alle Routen erfordern die übliche gekoppelte lokale Sitzung. Basispfad: `/api/projects/{projectId}/checks`.

| Methode | Pfad | Bedeutung |
| --- | --- | --- |
| GET | `/configuration` | Verfügbarkeit, Hinweis zu Voraussetzungen oder Grenzen, aktueller Quelltext-Fingerprint und Anzahlen |
| POST | leer | Expliziter Start mit `{expectedSourceVersion, expectedConfigurationVersion, requestId}` |
| GET | leer | Neueste gespeicherte Läufe mit aktuellem Veraltungsstatus |
| GET | `/{id}` | Laufstatus, begrenztes Protokoll, Exit-Code und Ergebnis |
| POST | `/{id}/cancel` | Expliziter Abbruch; wiederholte Abbrüche sind idempotent |

Eine wiederholte Startanforderung liefert den vorhandenen Lauf und startet keinen weiteren Prozess. Wird dieselbe Anforderungs-ID mit einem anderen Quelltext- oder Konfigurations-Fingerprint verwendet, antwortet die API mit HTTP 409. Ein neuer Lauf muss mit beiden angezeigten Fingerprints übereinstimmen. So lässt sich ein geänderter Host-Befehl nicht aus einem älteren UI-Zustand starten. Ein Start während einer laufenden Prüfung, fehlende Voraussetzungen oder ein geänderter erwarteter Fingerprint führen ebenfalls zu 409. Das Frontend muss die Konfiguration nach einer Quelltextübernahme aktualisieren und eine gesonderte Startaktion anbieten.

## Verifikation

```sh
dotnet run --project backend/VoiceStudio.CheckTests/VoiceStudio.CheckTests.csproj --artifacts-path /absolute/isolated/build-directory
```

Die Tests verwenden einen injizierten Testprozess für Lebenszyklus, Speicherung, Befehlsauswahl, Quelltext- und Konfigurationsänderungen, Idempotenz, Protokollgrenzen, Voraussetzungen und ungültige Eingabeumfänge. Kleine separate Testprogramme prüfen das tatsächliche gleichzeitige Auslesen von stdout und stderr, Exit-Codes ungleich null und den Abbruch des Prozessbaums. Die Tests rufen kein Modell auf und bauen die Zielwebsite nicht.
