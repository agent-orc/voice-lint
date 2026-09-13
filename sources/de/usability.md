# Entscheidungen und Quellversionen

## Eine Passage beibehalten oder eine Änderung prüfen

Markiere eine zugeordnete Passage oder öffne einen Befund. **So beibehalten** speichert das exakte Zitat und die Quellversion. Ergänze eine Begründung, wenn sie späteren Prüfenden hilft. Quelle und Regel bleiben unverändert. Eine Quelländerung macht die frühere Entscheidung veraltet.

**Alternativen erstellen** fordert beim konfigurierten Runner ein bis drei Ersetzungen mit Begründungen an. Eine optionale Vorgabe kann die Anfrage lenken. Ist keine Modellroute verfügbar, konfiguriere sie anhand der [Runner-Anleitung](runner-integration.md). Mit **Diese Änderung prüfen** bereitest du einen Diff vor. Prüfen und Anwenden erfolgen danach als getrennte Aktionen. Nutze bei Bedarf eigenes Feedback oder eine eigene Formulierung.

Läufe bleiben auch nach dem Wechsel der Auswahl sichtbar und abbrechbar. Wenn ein Start nicht bestätigt wurde, wiederhole die bestehende Anfrage, statt eine weitere Generierung zu starten. Prüfe gespeicherte Vorschläge anhand der aktuellen Auswahl und Quellversion.

## Den Quellstand des Reviews prüfen

**Datei und Git** zeigt die Datei, ihre Inhaltsversion und optionale Repository-Details. Änderungen an Datei und Repository werden getrennt dargestellt. Aktualisiere die Ansicht nach externen Änderungen; der angezeigte Branch bezeichnet nicht den online veröffentlichten Stand.

Ein gespeichertes Aufgabenergebnis enthält die Datei, Aufgaben- und Lauf-IDs, den Zeitpunkt, die ursprüngliche Quellversion und die erfassten Änderungen. Es zeigt den Diff des gespeicherten Vorschlags, auch wenn sich die heutige Quelle geändert hat. Die [Speicherreferenz](workflow.md#files-beside-the-source) zeigt die Ablage dieser Datensätze und ihre Verknüpfungen.

## Wenn Markierungen fehlen

Prüfe, ob Markierungen eingeschaltet sind. Öffne dann die Verbindungsanzeige für Zuordnungszahlen und Quelldetails. Eine zugewiesene Datei allein belegt noch keine Textübereinstimmung. Öffne einen Befund, um seine Passage zu finden; sie kann außerhalb des sichtbaren Bereichs liegen. Text in einem Bild lässt sich nicht als zugeordneter DOM-Text unterstreichen. Prüfe bei fehlender Übereinstimmung die Einheiten-ID und den exakten Text des Quelladapters anhand der [Bridge-Anleitung](../packages/review/LIVE-BRIDGE.md).

Wenn dieselbe Seite im normalen Browser Markierungen zeigt, im eingebetteten Browser jedoch nicht, nutze für diesen Review den normalen Browser. Das VS-Code-spezifische Darstellungsproblem wurde bisher weder reproduziert noch behoben.

## Sprache und Layout

Englisch ist die Standardsprache. Mit EN/DE wechselst du die Oberfläche und Regelerklärungen; Quellzitate, Feedback und Modelltexte behalten ihre ursprüngliche Sprache. Kompakt reduziert die Höhe der Navigation. Website-Fokus verbirgt die Navigation hinter frei positionierbaren Bedienelementen; die Navigation öffnet sich über der Seite. Ein geöffneter Review belegt immer eine eigene Spalte neben der Website. Im Website-Fokus schließt Escape den Navigationsdialog oder den geöffneten Review. Sprache und Anzeigeeinstellungen werden gespeichert, wenn Browserspeicher verfügbar ist.

## Die Arbeitsfläche aufteilen

Ziehe die Trennlinie neben dem Review oder der Projekt- und Dateiseitenleiste, um ihre Breite zu ändern. Beide Trennlinien unterstützen Touch, Pfeiltasten, Pos1 und Ende. Der Review bleibt in Normal, Kompakt und Website-Fokus neben der Website, auch auf kleinen Bildschirmen. Nach dem Schließen erhält die Website den Platz zurück. Die sichtbaren Breiten passen sich dem Ansichtsbereich an; die gespeicherten Wunschbreiten bleiben beim Ändern der Fenstergröße erhalten.

Projekte und Dateien lassen sich unabhängig voneinander einklappen. Klappe Projekte ein, um Dateien mehr Platz zu geben. Projekte erscheinen in kompakten Zeilen; die Dateiliste nutzt die verbleibende Höhe der Seitenleiste und scrollt gesondert. Die Einstellungen für beide Bereiche bleiben in diesem Browser gespeichert.

Ziehe im Website-Fokus den Griff neben Navigation, um die Bedienelemente zu verschieben. Die Pfeiltasten bewegen den fokussierten Griff; Pos1 setzt ihn nach links oben, Ende nach rechts unten. Seine gespeicherte Position bleibt auch nach einer Größenänderung innerhalb des Ansichtsbereichs.

Die Verbindungsanzeige öffnet Quellauswahl, Zuordnungszahlen und Verbindungsdetails. Nach dem Schließen der Details bleibt sie in der Browser-Werkzeugleiste sichtbar.
