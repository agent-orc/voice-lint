# Eine laufende Website in Voice Studio prüfen

Die Live-Bridge läuft in einer Website, die sie ausdrücklich einbindet. Studio bettet die tatsächliche URL ihres Entwicklungsservers ein. Skripte, CSS, native Links, Framework-Rendering und Router der Website laufen dabei weiter auf deren eigener Origin.

## Die Bridge im Entwicklungseinstieg der Website einbinden

```ts
import { connectVoiceStudio } from '@voice/review';

const connection = connectVoiceStudio({
  studioOrigin: 'http://127.0.0.1:4188'
});

// Dispose when the development integration is unloaded (e.g. HMR cleanup).
// connection.dispose();
```

Für einfaches HTML stellst du die gebaute Datei `dist/voice-review.js` über die Entwicklungsdateien der Zielwebsite bereit und lädst sie wie ein gewöhnliches Skript:

```html
<script src="/dev/voice-review.js"></script>
<script>
  const voiceConnection = VoiceReview.connectVoiceStudio({
    studioOrigin: 'http://127.0.0.1:4188'
  });
</script>
```

Aktiviere diese Integration nur im Entwicklungsmodus. Verwende die exakte Origin von Studio: `localhost` und `127.0.0.1` sind unterschiedliche Origins; das gilt auch für unterschiedliche Ports. Platzhalter werden nicht akzeptiert. Die Bridge empfängt ausschließlich Review-Daten und sendet Textauswahlen, Annotations-IDs, Zuordnungsdiagnosen und die aktuelle Seitenadresse. Sie erhält weder das Kopplungstoken des lokalen Backends noch Zugangsdaten für Modellanbieter.

## Das Live-DOM dem Quelltext zuordnen

Verwende nach Möglichkeit explizite `data-voice-unit`-Attribute. Die Kennung muss der `TextUnit.id` des Quelltextadapters entsprechen; der zuordenbare DOM-Text muss exakt mit dem Text dieser Einheit übereinstimmen. Eine Anwendung mit Framework oder Internationalisierung benötigt einen Quelltextadapter, der die tatsächliche Vorlage oder Übersetzungszeichenfolge erkennt. Eine gerenderte Route ist kein Quelldateiname. Zur Laufzeit übersetzter Text lässt sich nicht mit einem anderssprachigen Ersatztext in einer HTML-Datei gleichsetzen.

Ohne explizite Kennung kann die Bridge vorübergehend **ein einziges, exaktes Vorkommen des sichtbaren Elementtexts** markieren. Wenn ein Element und sein einziger texttragender Nachfahre dasselbe Vorkommen darstellen, wählt sie das tiefste Element. Wiederholter Text, doppelte noch nicht zugeordnete Quelleinheiten, nicht passende explizite IDs und mehrdeutige Treffer bleiben ohne Zuordnung. Die Bridge entfernt oder vereinheitlicht keine Leerzeichen, leitet keine Zuordnung aus ähnlichen Formulierungen ab und umschließt keine nativen Textknoten. Inline-Quelltextfragmente, die keinem vollständigen Element entsprechen, benötigen ausdrückliche Unterstützung durch den Adapter.

Hinzugefügt werden nur temporäre `data-voice-unit`-Attribute. Beim Ersetzen oder Trennen des Reviews wird ihr vorheriger Zustand wiederhergestellt. Native Knoten, Links und Event-Handler bleiben erhalten. Code, ausgeblendete Bereiche, bearbeitbare Steuerelemente und Bereiche mit `data-voice-exclude` sind ausgeschlossen. Normale DOM-Änderungen lösen eine erneute Zuordnung aus. Für anwendungsspezifische Rendering-Abläufe steht `refresh()` bereit.

## Protokollversion 1

Die exportierten Typen `VoiceStudioParentMessage` und `VoiceStudioChildMessage` definieren den Transportvertrag. Das übergeordnete Fenster verwendet `postMessage` mit der exakten Origin der Zielwebsite und prüft sowohl die Nachrichten-Origin **als auch** `event.source`. Die Bridge akzeptiert nur die ausdrücklich konfigurierte Studio-Origin und ihr tatsächliches Parent- oder Opener-Fenster. Nach dem Verbindungsaufbau behält sie diesen Kommunikationspartner bei.

1. Das übergeordnete Fenster sendet `voice-studio:connect` mit einer neuen zufälligen `sessionId` (16–128 ASCII-Buchstaben, Ziffern, `_` oder `-`; `crypto.randomUUID()` ist geeignet).
2. Das eingebettete Fenster antwortet mit `voice-studio:ready`, `sessionId`, `protocolVersion: 1` sowie der aktuellen `url` und dem `title`.
3. Das übergeordnete Fenster ermittelt das richtige Quelldokument und sendet anschließend `voice-studio:review` mit `sessionId`, einer neuen `reviewId`, der exakten `pageUrl`, `units`, `findings` und `feedback`. `pageUrl` enthält Query und Fragment. Alle Textbereiche bleiben in UTF-16 angegeben.
4. Das eingebettete Fenster liefert `voice-studio:mapping` mit `reviewId` und Diagnosen zurück. Antworten auf Textauswahlen enthalten `selection`; Klicks auf Annotationen liefern `findingId` oder `feedbackId` unter `voice-studio:selection`, `voice-studio:finding` und `voice-studio:feedback`. Das übergeordnete Fenster ignoriert veraltete Sitzungs- und Review-IDs.
5. Änderungen der SPA-History, Hash- und Popstate-Ereignisse sowie Adressänderungen senden `voice-studio:location`. Bei einer URL-Änderung werden die bisherigen Review-Anker sofort entfernt. Das übergeordnete Fenster ermittelt und sendet ein neues Review für die neue exakte Seiten-URL.
6. Das übergeordnete Fenster kann `voice-studio:select-finding` mit `sessionId`, `reviewId` und `findingId` (oder `null`) senden, um einen Befund aus dem Bericht zu fokussieren. Für die native Browser-History sendet es `voice-studio:navigate` mit `sessionId` und `action: 'back' | 'forward' | 'reload'`.
7. `voice-studio:disconnect` entfernt Review und Sitzung. Ein vollständiges Neuladen der Seite erzeugt eine neue Bridge-Instanz und erfordert einen neuen Verbindungsaufbau.

Fehlerhaft aufgebaute Reviews oder Reviews für eine veraltete Seiten-URL erzeugen einen dem Vorgang zugeordneten `voice-studio:error`. Nachrichten anderer Origins, Fenster oder Sitzungen werden ignoriert.

Studio verwendet derzeit ein iframe. Die CSP- und Frame-Header der Zielwebsite müssen das Einbetten durch die Studio-Origin erlauben; ihre Entwicklungs-CSP muss außerdem die Bridge-Datei und die Annotationsstile zulassen. Eine externe Seite, die mit `noopener` geöffnet wird, hat kein verbundenes Studio-Opener-Fenster. Sie wird unabhängig geöffnet und dient damit nicht als Ersatz für ein verbundenes Review. Nicht unterstützte Fälle sind entfernte Seiten ohne aktivierte Bridge, geschlossene Shadow Roots, nicht unterstützte Quelltextadapter und Header, die das Einbetten in iframes blockieren. Das Live-Review erteilt einer Seite keine Berechtigung zum Schreiben von Quelldateien: Speicherung und geprüfte Diffs bleiben im Studio-Backend.
