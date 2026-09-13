# Voice-Studio-Befehlskatalog

Führe diese Befehle im Voice-Studio-Arbeitsverzeichnis aus. Die Anforderungen an Node.js, Bash und .NET stehen in der [Haupt-README](../README.md).

| Befehl | Zweck und Voraussetzungen | Schreibzugriffe / Ausgabe |
| --- | --- | --- |
| `npm start` | Lokales Studio und Beispielwebsite bauen und starten | Generierte Builds und privater lokaler Sitzungszustand |
| `npm run pairing-code` | Lokalen Kopplungscode der laufenden Installation abrufen | Gibt den Kopplungscode aus, niemals das Bearer-Token |
| `npm run build` | Beide Libraries, Angular-Frontend und .NET-Backend bauen | `dist/`, `bin/`, `obj/` |
| `npm run build:frontend:staged` | Frontend bauen, ohne die aktuell ausgelieferten Dateien zu ersetzen | `frontend/dist/voice-studio-next/` |
| `npm run frontend:publish-local` | Ein bereits fertig gebautes Frontend aus dem Bereitstellungsordner kopieren; die Einstiegsdatei zuletzt | Ersetzt das lokal ausgelieferte Frontend; kein Backend-Neustart und keine entfernte Veröffentlichung |
| `npm run website:build` | Zweisprachige Produktseiten, Library-Demo und gestaltete technische HTML-Leitfäden bauen | `website/dist/voice/`; keine Veröffentlichung |
| `npm run website:preview` | Vorschau der öffentlichen Website bauen und auf Loopback-Port 5187 bereitstellen | Dieselbe statische Ausgabe und ein lokaler Prozess |
| `npm run website:verify-artifact` | Statisches Veröffentlichungsinventar, Quelltexthashes, Git-Revision, Routen und Grenzen der öffentlichen Browserfunktionen validieren; erfordert einen sauberen committeten Build | Nur lesend; `-- --allow-dirty` ist auf lokale Vorbereitungen beschränkt |
| `npm run website:verify-deployment` | Das festgelegte öffentliche Voice-Ziel mit dem exakten lokalen Artefakt vergleichen; Routen, Inhaltstypen und Hosting-Grenzen prüfen | Nur lesende öffentliche Anfragen; Bericht unter `test-results/voice-deployment/` |
| `npm run test:source-provenance -- --help` | Konfigurierbare Prüfung von Quelltext, Hash und Git sowie optional der Aufgabenherkunft an einem laufenden lokalen Studio | Kompakter Bericht unter dem ignorierten `test-results/`; keine Quelltextänderung und kein Modellaufruf |
| `npm run docs:dossier:check -- --repository .` | Gepflegten VL-W1-Abschnitt mit dem Dossier in diesem Checkout vergleichen | Keine Schreibzugriffe; Exit-Code ungleich null, wenn eine Synchronisierung erforderlich ist |
| `npm run docs:dossier:sync -- --repository .` | Gepflegten Dossierinhalt und Darstellung synchronisieren, dabei Lebenszyklusfelder erhalten | Explizite Schreibzugriffe auf die Dossierdateien dieses Checkouts; keine Git-Operation |
| `npm run test:dossier` | Bereitgestelltes Dossier sowie Desktop- und Mobil-Layout prüfen | `test-results/dossier-integration/`; keine API-Änderungen |
| `npm run test:evidence` | Alle ausgewählten Nachweismanifeste, zulässige Pfadgrenzen und Dateihashes prüfen | Nur lesend; führt historische Tests nicht erneut aus |
| `npm run test:holistic-schema` | Vorgeschlagene JSON-Beispiele, Verweise und Hashes validieren; fehlerhafte Varianten ablehnen | Nur offline; kein Repository- oder Website-Review und kein Modell |
| `npm run build:writing-rules` | Lokalen Schreibregelkatalog, Prompt-Komposition und API für sprachliche Oberflächensignale bauen | ESM-Dateien, JSON und Typdeklarationen unter `packages/writing-rules/dist/` |
| `npm run test:writing-rules` | Übereinstimmung von Regeln und Quellen, Prompt-Grenzen, Signale und typisierte Paketnutzer prüfen | Offline-Testfälle; kein Modellaufruf |
| `npm run test:json-viewer` | JSON-Dialoge mit einem isolierten Loopback-Testaufbau prüfen | Browserbericht unter `test-results/voice-website/`; kein Studio-Zugriff |
| `npm run test:writing-patterns` | Veröffentlichten Schreibregelkatalog, englische und deutsche Filter, Beispiele und das Fehlen ausführbarer Schreibwerkzeuge prüfen | Browserbericht; standardmäßig lokale Vorschau oder das unten festgelegte öffentliche Ziel |
| `npm run test:website` | Routen, Englisch und Deutsch, mobiles Layout und das bereitgestellte HTML-Annotationsbeispiel im Browser prüfen | Ignorierte Screenshots und Bericht; standardmäßig lokale Vorschau oder das unten festgelegte öffentliche Ziel |
| `npm run test:website-seo` | 48 statische englische und deutsche Routen, Sprachabdeckung und SEO-Metadaten prüfen | Nur lesende Anfragen an die lokale Vorschau oder das festgelegte öffentliche Ziel; Bericht unter dem ignorierten `test-results/` |
| `npm run test:research` | Zweisprachige Forschungsdatensätze, Quellen- und API-Links sowie JSON-Dialoge prüfen | Ignorierter Browserbericht; standardmäßig lokale Vorschau oder das unten festgelegte öffentliche Ziel |
| `npm run test:library-types` | Isolierte TypeScript- und JavaScript-Paketnutzer kompilieren sowie tatsächliche IntelliSense-Vervollständigungen und Hover-Dokumentation prüfen | Offline-Pakettestfälle; keine UI-Automatisierung von VS Code |
| `npm run test:session` | Backend-Verträge für Browservertrauen, Ablauf, Neustart und Widerruf prüfen | Isolierter temporärer Sitzungszustand; kein laufendes Backend |
| `npm run test:session-ui` | Wiederaufnahme-, 401- und Nebenläufigkeitsregressionen in den tatsächlichen UI-Methoden prüfen | Nur simuliertes HTTP |
| `npm run test:browser-session` | Schließen und Wiederöffnen von Chrome, Neuladen, neue Tabs, Abmeldung und temporäre Sitzungen prüfen | Isoliertes Browserprofil und Sitzungsvertrauen; keine Projekt-, Quelltext- oder Modellschreibzugriffe |
| `npm run test:selection-ui` | Regressionen bei verzögerten HTTP-Anfragen und Zustandsänderungen für Beibehalten, Alternativen, Wiederholungen und Abbruch prüfen | Nur simuliertes HTTP |
| `npm run test:selection-workflow` | Quelltext-, Beibehalten- und Vorschlagsablauf im echten Browser mit eigenen temporären Testdaten prüfen | Registriert und bearbeitet ausschließlich die eigenen Testdaten und entfernt sie anschließend samt Registrierung; kein Modell |
| `npm run test:navigation` | Sprache, kompakte und Fokusnavigation sowie Overlay-Szenarien im Browser prüfen | Browserlokale Einstellungen und ignorierte Nachweise; erfordert Studio und die konfigurierte Pilotwebsite |
| `npm run test:loading-overlay` | Verzögertes Laden ohne Layoutsprünge prüfen; erfordert ein laufendes Studio mit den Projekten `quality-website` und `markdown-handbook` sowie Chrome | Nur lesende Projekt-API-Aufrufe und temporäre Testsitzungskopplung; ignorierte Screenshots und Bericht unter `test-results/loading-overlay/` |
| `npm run test:wiki-i18n` | Übersetzungsabdeckung des Wikis und Erhalt von Quelltextzitaten prüfen | Nur offline |

Backend-Tests (`test:backend`, `test:runner`, `test:tasks`, `test:checks`, `test:selection`, `test:session`) und Library- beziehungsweise UI-Tests prüfen ihre jeweiligen Verträge. Runner-Tests verwenden simulierte Implementierungen. Verwende einen isolierten .NET-Artefaktpfad, wenn eine laufende API sonst ihre Build-Dateien sperren könnte.

`session.mjs` ist ein internes Hilfsskript zum Lesen des privaten Sitzungszustands und kein Nachweisexporter. `publish-built-frontend.mjs` stellt das Frontend lokal bereit; es veröffentlicht nicht die öffentliche Ökosystem-Website.

## Browserprüfungen der öffentlichen Website

Diese Befehle verwenden das festgelegte öffentliche Veröffentlichungsziel anstelle der lokalen Vorschau:

```sh
VOICE_WEBSITE_URL=https://agent-orchestrator.dev/voice/ npm run test:website
VOICE_WEBSITE_URL=https://agent-orchestrator.dev/voice/ npm run test:research
VOICE_WEBSITE_URL=https://agent-orchestrator.dev/voice/ npm run test:writing-patterns
```

Das zulässige Ziel ist ausdrücklich festgelegt. Öffentliche Berichte werden getrennt von lokalen Vorschauberichten gespeichert. Die Prüfungen verwenden keine Studio-Sitzung und senden keine Modellanfragen.

## Szenarioskripte

Der Pilot für die Agent-Studio-Website benötigt deren tatsächliches lokales Quellverzeichnis. Gib `--website PATH` an; die Skripte setzen nicht voraus, dass die Website neben diesem Checkout liegt. `PATH` muss die konfigurierte Angular-Website und deren `voice.config.json` enthalten.

```sh
npm run test:live -- --website PATH
node scripts/verify-website-revision.mjs --run --website PATH
node scripts/reconcile-website-review.mjs --website PATH --dry-run
```

Die ersten beiden Prüfungen benötigen eine laufende Pilotwebsite. `test:live` benötigt zusätzlich Studio und registriert den angegebenen Ordner. Der Abgleich benötigt die ursprünglichen Audit- und Importdatensätze sowie das passende Website-Verzeichnis. Sein Probelauf schreibt nur einen lokalen Plan. Die Anwendung dieses Plans bleibt ein separater Vorgang mit Prüfsummenprüfung.

Die vorhandenen Skripte `pilot-*.mjs`, `import-website-review.mjs` und `reconcile-website-review.mjs` bilden szenariospezifische Abläufe mit eigenen Quelltext- und Versionsannahmen ab. Manche erstellen ausdrücklich Aufgaben, rufen das konfigurierte Modell auf oder übernehmen Quelltextvorschläge. Sie sind keine allgemeinen Kurzprüfungen. Lies vor einem autorisierten Lauf das Skript und den zugehörigen [Review-Datensatz](../docs/reviews/). Ältere Dateien mit dem Muster `verify-*.mjs` können sich auf eine dokumentierte deutsche Pilotoberfläche beziehen. Die derzeit unterstützten Einstiegspunkte stehen oben und in `package.json`.

Die [Dateizuständigkeiten und Aufbewahrung](../docs/maintaining.md) beschreiben versionierte Quellen, generierte Ausgaben und private Laufzeitdateien.

## Messungen für Schreibreviews

`npm run benchmark:writing-review` baut das Paket mit den Schreibregeln und führt `benchmarks/writing-review/run.mjs` für die gepflegten englischen und deutschen Testfälle aus. Der Lauf schreibt `test-results/writing-review/report.json` und sendet keine Anbieteranfragen.

Nach der Ergebnisprüfung validiert `npm run benchmark:writing-review:retain` die Eingabehashes und aktualisiert die Messübersicht der Website. Baue die Website neu, um die Übersicht anzuzeigen. Der aufbewahrte Datensatz unterscheidet Bytes von Tokens und Trefferkandidaten des lokalen Scanners von der Wirksamkeit eines Modells.
