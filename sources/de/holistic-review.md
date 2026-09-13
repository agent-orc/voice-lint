# Quelltext in einem Git-Repository prüfen

Öffne einen lokalen Git-Checkout in Studio, um dessen Website oder unterstützte Quelldateien zu prüfen. Studio liest die Arbeitskopie, zeigt ihre Quelltextversion an und speichert Entscheidungen und Aufgaben beim Quelltext.

## Den Versionsstand feststellen

Prüfe vor dem Review unter **Datei und Git** die Quelldatei, den Branch, den ermittelten Commit und lokale Änderungen. Aktualisiere die Ansicht nach einer externen Bearbeitung. Du kannst den Checkout auch direkt prüfen:

```sh
git branch --show-current
git rev-parse HEAD
git status --short
```

Eine unveränderte Datei bedeutet nicht, dass das gesamte Repository unverändert ist. Verwendet das Review noch nicht committete Änderungen, bewahre diese Inhalte mit dem Review auf; der Basis-Commit allein kann sie nicht reproduzieren. Halte bei einer laufenden Website auch die Build-Kennung fest. Aus dem aktuellen Checkout lässt sich nicht ableiten, welchen Stand ein zuvor gestarteter Server oder die veröffentlichte Website rendert.

## In Git speichern

Git speichert den Projektquelltext und die Review-Datensätze, die du in die Versionsverwaltung aufnimmst. Studio schreibt seine aktuellen Datensätze in das registrierte Projekt:

```text
.voice-lint/
  reviews/<document-id>.voice-meta.json
  tasks/<document-id>/<task-id>.json
  semantic-runs/<run-id>/
  backups/<document-id>/
  transactions/
```

Die [Speicherreferenz](workflow.md#files-beside-the-source) erklärt diese Dateien und enthält vollständige JSON-Beispiele. Studio erstellt keine Commits und ändert keine Ignore-Regeln des Projekts. Prüfe den Diff vor dem Commit von Review-Daten: Aufgaben- und Laufdateien können vollständigen Quelltext, Prompts und Modellausgaben enthalten; Transaktionsjournale enthalten einen lokalen Sicherungspfad. Halte Sitzungszugangsdaten und Dateien des Installationsregisters von gemeinsam genutzten Review-Datensätzen getrennt.

## Anhand des Seitenziels prüfen

Halte in der Anweisung der Quelltextaufgabe Zielgruppe, Seitenzweck und zu bewahrende Aussagen fest. Füge den relevanten freigegebenen Kontext bei. Stammt er aus einem separaten Marketing-Repository, gib dessen Commit und Dateipfad an. Studio importiert ein Repository mit Marketing-Kontext nicht automatisch.

Prüfe die zugeordneten Textstellen, behalte bewusst gewählte Formulierungen bei und speichere konkretes Feedback. Für eine umfangreichere Änderung innerhalb einer unterstützten Datei erstelle und starte ausdrücklich eine Quelltextaufgabe. Ihr Ergebnis bewahrt Quelltextversion, Lauf und vorgeschlagenen Diff. Lies vor der Übernahme den vollständigen Diff, führe danach die konfigurierte Projektprüfung aus und prüfe die gerenderte Seite.

Der Projektbericht von Studio fasst Dateibefunde zusammen. Das derzeitige semantische Review und die Quelltextaufgaben bearbeiten jeweils eine Datei mit konfiguriertem zugehörigem Kontext. Eine websiteweite Bewertung von SEO, Konsistenz oder visuellem Eindruck erfordert eine separat abgegrenzte Agentenaufgabe. Eine eingebaute ganzheitliche Bewertung oder einen AGT-Pipeline-Schritt gibt es noch nicht.

## Das Ergebnis aufbewahren

Bewahre geprüften Quelltext, Aufgaben- und Laufdatensätze sowie relevante Nachweise zusammen auf. Gib bei Screenshots Aufnahmezeit, Route, Viewport und Build an, bei Prüfungen außerdem Befehl und Ergebnis. Ein Quelltext-Hash erkennt Änderungen, kann den Quelltext aber nicht wiederherstellen. Gespeicherte Vorschläge zeigen den damaligen Diff der Aufgabe; den aktuellen Diff erhältst du mit Git.

So prüfst du Quelltextbezug und optional die Herkunft gespeicherter Aufgaben an einem laufenden Studio:

```sh
npm run test:source-provenance -- --help
```

Der Befehl dokumentiert die erforderlichen Projekt- und Dateiargumente und schreibt einen kompakten Bericht unter `test-results/`. Er leitet daraus keinen Versionsstand einer veröffentlichten Website ab.
