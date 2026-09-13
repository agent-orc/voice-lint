# Drittanbieterabhängigkeiten und Lizenznachweise

Die npm-Metadaten wurden am 2026-09-12T10:45:12.969Z aktualisiert. Dieser Datensatz unterscheidet tatsächliche Abhängigkeiten von vorgeschlagenen Sprachwerkzeugen. Für die NuGet-Metadaten und Repository-Verweise unten gilt weiterhin das ursprüngliche Prüfdatum 2026-09-06; die npm-Aktualisierung prüft sie nicht erneut. Die Lizenzierung des eigenen Projekts ist in der [LICENSE](LICENSE) des Repositorys festgelegt. Für die unten aufgeführten Abhängigkeiten gelten ihre eigenen Bedingungen. Die verlinkten Lizenztexte bleiben in ihrer Originalfassung maßgeblich.

## Metadaten der tatsächlichen Abhängigkeiten

| Komponente | Aufgelöste Version(en) | Angegebene Lizenz | Nachweis |
|---|---|---|---|
| Angular-Laufzeitpakete | 21.2.22 | MIT | Installierte Paketmanifeste; package-lock.json |
| Angular build / CLI | 21.2.23 | MIT | Installierte Paketmanifeste; package-lock.json |
| Angular compiler-cli | 21.2.22 | MIT | Installiertes Paketmanifest; package-lock.json |
| RxJS | 7.8.2 | Apache-2.0 | Installierte rxjs/package.json; package-lock.json |
| tslib | 2.8.1 | 0BSD | Installierte tslib/package.json; package-lock.json |
| TypeScript | 5.8.3 und 5.9.3 | Apache-2.0 | Installierte Manifeste; für Builds und den AST-Adapter des Backends verwendet |
| esbuild | 0.25.12, 0.28.1, 0.28.2 | MIT | Aufgelöste und installierte Manifeste; Build-Abhängigkeit |
| jsdom | 26.1.0 | MIT | Installiertes Manifest; Library-Tests |
| Playwright test | 1.63.0 | Apache-2.0 | Installiertes Manifest; Browsertests in der Entwicklung |
| Marked | 18.0.12 | MIT | Markdown-Parser beim Website-Build; installierte marked/package.json und package-lock.json |
| Ajv | 8.18.0 | MIT | Schema- und Beispielvalidierung in der Entwicklung; installierte ajv/package.json und package-lock.json |
| Ajv-formats | 3.0.1 | MIT | Schemaformatvalidierung in der Entwicklung; installierte ajv-formats/package.json und package-lock.json |
| CodingAgentRunner | 0.7.0 | Apache-2.0 | Lizenzausdruck der installierten NuGet-.nuspec-Datei; [Lizenz](https://licenses.nuget.org/Apache-2.0), [Paket](https://www.nuget.org/packages/CodingAgentRunner/0.7.0) |
| Microsoft.Extensions.Logging.Abstractions | 9.0.0 | MIT | Installierte NuGet-Metadaten; [Lizenz](https://licenses.nuget.org/MIT) |
| Microsoft.Extensions.DependencyInjection.Abstractions | 9.0.0 | MIT | Installierte NuGet-Metadaten; transitive Abhängigkeit von Logging.Abstractions |

Das CodingAgentRunner-Paket nennt als Quelle
https://github.com/agent-orc/runner, Commit
d456110e17326188d79027db6e7307d0a7e95f2f.
Seine net9-/net10-Abhängigkeitskette enthält die beiden oben genannten Microsoft-Pakete. Deren NuGet-Metadaten nennen den dotnet/runtime-Commit
9d5a6a9aa463d6d10b0b0ba6d5982cc82f363dc3.
Die über Runner aufgerufenen CLI-Programme werden separat installiert und nicht mit Voice Studio weitergegeben. Ihre Lizenzen, Kontobedingungen und Nutzungsbedingungen sind gesondert zu berücksichtigen.

[npm-inventory.json](docs/licenses/npm-inventory.json) erfasst alle 604 aufgelösten npm-Abhängigkeitseinträge mit Version, angegebener Lizenz und der Angabe, ob installierte Metadaten gelesen wurden. Diese Anzahl schließt optionale und plattformspezifische Pakete ein und bezeichnet nicht die Anzahl ausgelieferter Browsermodule. Paketmetadaten allein sind keine vollständige Prüfung dateispezifischer Ausnahmen, mitgelieferter Daten oder erforderlicher Hinweise.

Bewahre für einen weitergebbaren Build die Lizenz- und Urheberrechtsunterlagen der Abhängigkeiten, die von Angular erzeugte Ausgabe mit Drittanbieterlizenzen und alle erforderlichen NOTICE-Dateien auf. Prüfe das tatsächliche Bundle und die ausgewählte Laufzeitdistribution. Diese Übersicht ersetzt jene Dateien nicht und behauptet keine vollständige Prüfung aller Lizenzpflichten für die Weitergabe.

## Mögliche Sprachwerkzeuge

LanguageTool, Vale, CSpell, Hunspell, textlint und die Wörterbuchbeispiele wurden mit dieser Aktualisierung weder installiert noch gebündelt. Die quellenbasierte Lizenzrecherche, die Unterscheidung der einzelnen Ressourcen und die Voraussetzungen für ihre Aktivierung stehen in [language-tooling.md](docs/language-tooling.md).

Die MIT-Lizenz eines Frameworks oder Prüfwerkzeugs lizenziert nicht automatisch dessen Wörterbücher oder Regelpakete. Offene Fragen zu Datenlizenzen müssen vor der Auswahl eines Artefakts zur Weitergabe ausdrücklich ausgewiesen bleiben.
