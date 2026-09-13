# Texte mit wiederverwendbaren Regeln prüfen

`@voice/writing-rules` enthält 20 kontextbezogene Prüfregeln, vier Aufgabenprofile und englische sowie deutsche Beispiele. Du kannst damit Prüfanweisungen vorbereiten oder eine begrenzte Menge sichtbarer Formulierungsmuster finden. Jede Regel enthält ein Gegenbeispiel, das so bleiben kann, und nennt die Bedingungen, unter denen eine vorgeschlagene Überarbeitung die Bedeutung bewahrt.

## Das problematische Muster erkennen

Jede Regel beginnt mit einem `antiPattern`: einem konkreten Namen, dem beobachtbaren Merkmal und seinem Nachteil für Lesende, jeweils auf Englisch und Deutsch. Beispiele sind **Entwicklungstagebuch**, **Nicht X, sondern Y**, **Gehäufte Abschwächungen**, **Zusammenfassungsschleifen**, **Unverdientes Lob**, **Falsche Ausgewogenheit**, **Unpriorisierte Aufzählung** und **Erzwungene Dreiergruppen und vorgefertigte Frage-Antwort-Muster**. Der positiv formulierte `title` und der `prompt` beschreiben, wie das Muster geprüft oder behoben werden kann.

Ein Muster ist eine Kritik im jeweiligen Kontext, kein Beweis für KI-Autorschaft. Ein tatsächlicher Vergleich, nützliche Vorgeschichte, Unsicherheit durch fehlende oder widersprüchliche Belege oder eine bewusste Stilentscheidung können erhalten bleiben. `relatedRuleIds` kennzeichnet Überschneidungen: Bei einer unpriorisierten Aufzählung geht es um Relevanz und Gewichtung, bei überladener Formatierung um Darstellung. Eine erzwungene Vorlage kann die Form wiederholen, auch wenn sich die Fakten unterscheiden.

## Die Aufgabe der Lesenden auswählen

| Profil | Schwerpunkt der Prüfung |
| --- | --- |
| `public-docs` | Lesenden die Nutzung des verfügbaren Produkts ermöglichen, ohne Entwicklungsgeschichte oder ablenkende Nebenthemen. |
| `technical-reference` | Konkrete Objekte, Operationen und Begriffe erklären und dabei notwendige Bedingungen erhalten. |
| `product-copy` | Erklärung und Aussagen mit dem Ziel der Lesenden und stützenden Belegen verbinden. |
| `agent-report` | Das beobachtete Ergebnis klar erklären, mit nützlichen Nachweisen und Grenzen des Prüfumfangs. |

Jedes Profil wählt sechs Regeln aus. Die vier zusätzlich aufgenommenen Muster sind über einzelne Regel-IDs verfügbar und erweitern diese Standardauswahl nicht. Eine Anwendung kann stattdessen einzelne Regel-IDs auswählen. Beispielsweise fragt `concrete-subject`, worauf sich eine abstrakte Formulierung tatsächlich bezieht. `calibrated-uncertainty` schützt tatsächliche Unsicherheit und hinterfragt zugleich überflüssige Einschränkungen. Keine der beiden Regeln erklärt das Wort „preferred“ grundsätzlich für falsch.

Das Paket wird aus diesem Workspace gebaut:

```sh
npm --prefix packages/writing-rules run build
npm --prefix packages/writing-rules test
```

Das Paket ist lokal verfügbar und wurde nicht auf npm veröffentlicht. TypeScript-Deklarationen und JSDoc sind im ESM-Build enthalten. JavaScript-Anwendungen können `// @ts-check` verwenden.

## Kandidaten im Text finden

```ts
import { findWritingSignals } from '@voice/writing-rules';

const text = '😀 A powerful example.';
const result = findWritingSignals(text, { language: 'en' });
const first = result.signals[0];
// quote: "powerful", start: 5, end: 13, encoding: "utf16"
// kind: "surface-cue", reviewRequired: true

console.log(result.coverage.scannedRuleIds);
console.log(result.coverage.unscannedRuleIds);
```

Der Scanner verwendet 16 veröffentlichte reguläre Ausdrücke für acht Regeln in Englisch und Deutsch. Die übrigen zwölf Regeln benötigen eine kontextbezogene Prüfung. Die Ausdrücke finden Kandidaten wie austauschbare Adjektive, gekoppelte Abschwächungen oder geläufige Einstiege in Kontraste. Sie bestimmen nicht, ob eine Einschränkung unnötig ist, eine Aussage stimmt oder ein Dokument sinnvoll aufgebaut ist.

Offsets beginnen bei null und beschreiben halboffene UTF-16-Bereiche in der übergebenen Zeichenfolge. Zitierte Beispiele und Code werden mit durchsucht. Bevor ein Kandidat zu einem Studio-Befund wird, muss die Anwendung seine Texteinheit, das genaue Zitat, die Quellzuordnung und die Quellversion prüfen. Der Scanner erstellt keine `Finding`-Objekte, speichert kein Feedback und bearbeitet keine Quelldateien.

`maxSignals` verwendet standardmäßig 50 und akzeptiert Werte von 1 bis 500. Das zurückgegebene Feld `truncated` zeigt an, dass Treffer ausgelassen wurden. Die Eingabe ist auf 250.000 UTF-16-Einheiten begrenzt. Eine ausgewählte Regel ohne lexikalisches Muster erscheint in `unscannedRuleIds`. Ein leeres Ergebnis belegt nicht, dass der Text gut ist. Es handelt sich um sprachliche Hinweise, nicht um Nachweise der Urheberschaft. Siehe [KI-Textsignale und ihre Grenzen](ai-text-signals.md).

## Prüfanweisungen zusammenstellen

```ts
import { composeWritingReviewPrompt } from '@voice/writing-rules';

const review = composeWritingReviewPrompt({
  profile: 'public-docs',
  audience: 'Developers using Studio for the first time',
  goal: 'Open a source folder and complete one review',
  language: 'en',
  maxFindings: 5
});

console.log(review.catalogueVersion, review.ruleIds);
console.log(review.prompt);
```

Die Zusammenstellung erfolgt lokal. Das Ergebnis enthält Anweisungen, ausgewählte Regel-IDs und die Katalogversion. Es wird weder ein Modell noch ein Anbieter oder Runner gestartet. Zielgruppe und Ziel sind vertrauenswürdige Konfiguration der einbindenden Anwendung. Übergib Quellmaterial davon getrennt als Prüfdaten.

Der Prompt fordert genaue Zitate, Quellenpositionen, Auswirkungen auf die Aufgabe der Lesenden und Begründungen an. Wenn eine Änderung angebracht ist, verlangt er ein bis drei unterschiedliche Alternativen. Andernfalls erlaubt er eine begründete Entscheidung, den Text beizubehalten. Beispiele erlauben weder erfundene Fakten noch automatischen Ersatz. Notwendige Einschränkungen, Fachbegriffe und akzeptierte Entscheidungen bleiben geschützt.

Die Anwendung bestimmt die Ausführung, validiert jede Modellantwort und stellt die Entscheidung dar. Dieses Paket validiert keine erzeugten Befunde und garantiert nicht, wie viele Ergebnisse ein Modell liefert. `maxFindings` ist eine Anweisung, kein Kosten- oder Tokenlimit.

## Den Katalog direkt lesen

```ts
import {
  writingCatalogue, getWritingRule, selectWritingRules
} from '@voice/writing-rules';

const rule = getWritingRule('concrete-subject');
const rules = selectWritingRules({
  profile: 'public-docs',
  ruleIds: ['current-state', 'calibrated-uncertainty']
});
```

Die Auswahl erhält die Reihenfolge des Katalogs und entfernt doppelte IDs. Unbekannte IDs und Profile lösen einen Fehler aus. Wenn sowohl ein Profil als auch IDs angegeben sind, muss jede ID zu diesem Profil gehören. Zum Nachsehen ist eine leere Auswahl erlaubt; die Prompt-Erstellung benötigt jedoch mindestens eine Regel. Von der API zurückgegebene Objekte sind vollständig eingefroren, einschließlich verschachtelter Objekte. Die separaten JSON-Exporte sind gewöhnliche Datenobjekte. Änderungen daran konfigurieren die API nicht.

Das Paket exportiert außerdem `@voice/writing-rules/catalogue.json` und `@voice/writing-rules/surface-patterns.json`. Browser-Anwendungen können die gebaute `index.js` direkt ausliefern oder den ESM-Einstieg bündeln. Dieses Modul enthält seine eigenen internen Daten und arbeitet unabhängig von den optionalen JSON-Downloads. Es gibt keine Laufzeitabhängigkeiten und keine Netzwerkaufrufe.

## Quellen und modellspezifische Hinweise

Jede Regel verweist auf Quelldatensätze mit URL, Abrufdatum, relevanter Stelle, belegter Aussage und Einschränkung. `relation` unterscheidet Prompt-Empfehlungen des Anbieters, redaktionelle Empfehlungen, daraus von Voice abgeleitete Regeln und ergänzende Forschung. Die zweisprachigen Beispiele wurden von Voice erstellt. Ausgenommen ist die ausdrücklich gekennzeichnete, vom Nutzer bereitgestellte Passage aus der Voice-Dokumentation beim Entwicklungstagebuch. Keines der Beispiele wird als ungekennzeichnete aufgezeichnete Modellantwort oder als gemessener Modellfehler dargestellt.

[OpenAIs Stilhinweise](https://developers.openai.com/api/docs/guides/latest-model#personality-and-writing-style) und [Anthropics Prompt-Empfehlungen](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) fließen in die Prompt-Erstellung ein. Sie belegen nicht, dass sämtliche Ausgaben von Claude oder OpenAI/Codex dieselben Schwächen haben. Die Anwendung hält die tatsächlich verwendete Modellidentität fest und bewertet das ausgewählte Profil anhand eigener Aufgabenbeispiele.

[Microsofts Dokumentationshinweise](https://learn.microsoft.com/en-us/contribute/content/style-quick-start) und [Googles Hinweise zur Zeitform](https://developers.google.com/style/tense) fließen in die Dokumentationsprofile ein. [Die zitierte linguistische Studie](https://aclanthology.org/2025.emnlp-main.1163/) liefert Forschungskontext. Ihre zusammengefassten Beobachtungen sind kein Qualitätstest für eine einzelne Passage.

OpenAIs [Bericht über Sykophanz vom April 2025](https://openai.com/index/sycophancy-in-gpt-4o/) dokumentiert ein bestimmtes, zurückgenommenes GPT-4o-Update. Er begründet, unverdiente Zustimmung zu untersuchen, nicht dieses Verhalten jedem aktuellen Modell zuzuschreiben. Die [datierte Model Spec](https://model-spec.openai.com/2025-12-18.html#assume-an-objective-point-of-view) beschreibt beabsichtigtes Verhalten und dient als Grundlage für Vergleiche, die Aussagen nach ihrer Beleglage gewichten.

## Pflegen und prüfen

Die maßgeblichen Daten liegen in `packages/writing-rules/src/catalogue.json` und `surface-patterns.json`. Ändere die Katalogversion, wenn Regeln, Beispiele, Profile oder das Erkennungsverhalten geändert werden. Erhalte stabile IDs und prüfe die Quellen erneut, wenn sich Anbieterhinweise ändern.

Tests decken Katalogintegrität, Referenzen, Beibehalten-Fälle, Auswahl, Prompt-Erstellung, ausgelieferte TypeScript-Deklarationen und genaue lexikalische Bereiche ab, einschließlich Unicode und Kürzung. Diese Prüfungen verifizieren Softwareverhalten. Sie messen weder redaktionellen Nutzen noch Detektorgenauigkeit oder Antwortqualität eines Anbieters. Die bestehenden vier lokalen Studio-Regeln bleiben eine separate Implementierung.
