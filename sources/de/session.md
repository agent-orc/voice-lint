# Browsersitzungen und lokale Kopplung

Öffne die lokale Studio-Anwendung unter `http://127.0.0.1:5188/` und gib den aktuellen Kopplungscode ein. **Diesen Browser 7 Tage merken** ist standardmäßig ausgewählt. Nach der Kopplung können Neuladen, neue Tabs und das erneute Öffnen dieses Browsers die Sitzung fortsetzen. Mit **Abmelden** widerrufst du den gespeicherten Zugang dieses Browsers.

```sh
npm run pairing-code
```

Führe den Befehl im Voice-Studio-Arbeitsverzeichnis aus, wenn der beim Start angezeigte Code im Terminal nicht mehr sichtbar ist. Er gibt ausschließlich den aktuellen Kopplungscode der Installation aus, nicht den Bearer-Token der API.

## Was gespeichert wird

Der Browser erhält ein nicht interpretierbares Cookie mit HttpOnly, SameSite=Strict und ohne Domain-Freigabe für andere Hosts. Es ist auf `/api/session` beschränkt. Das lokale Backend speichert nur den Hash der Zugangsdaten, den genauen Origin sowie Erstellungs- und Ablaufzeitpunkt in der privaten Datei `trusted-browsers.json`. Dieses Register liegt außerhalb des geprüften Repositorys. Der Bearer-Token für gewöhnliche API-Anfragen bleibt im Arbeitsspeicher des Browsers. Das Cookie allein berechtigt nicht zu Operationen der Projekt-API.

Die Gültigkeit beträgt sieben Tage ab der Kopplung. Neuladen verlängert diese Frist nicht. Der gespeicherte Browserzugang übersteht einen Neustart des Backends; beim Fortsetzen erhält der Browser wieder einen gültigen Bearer-Token im Arbeitsspeicher. Das HTTP-Cookie auf der Loopback-Adresse trägt kein Secure-Attribut, weil diese lokale Installation HTTP verwendet. Dieses Sitzungsverfahren ist für die lokale Anwendung ausgelegt und kein gehosteter Anmeldedienst.

## Adresse und Browserprofil

Verwende weiterhin dasselbe Browserprofil und dieselbe App-Adresse. `localhost` und `127.0.0.1` sind unterschiedliche Hosts; auch der Port gehört zur Bindung an den genauen Origin. Ein anderes Profil, eine private Browsersitzung, gelöschte Websitedaten oder abgelaufene Zugangsdaten erfordern eine neue Kopplung. Ohne Häkchen entsteht eine temporäre Sitzung im Arbeitsspeicher: Nach dem Neuladen der Seite wird der Code erneut benötigt.

## Das Anwendungsverzeichnis verschieben

Setze `VOICE_STUDIO_SESSION_ROOT` in der Startumgebung des Hosts, um ein bestehendes privates Sitzungsverzeichnis beizubehalten, wenn sich `VOICE_STUDIO_HOME` ändert. Den aktuellen Speicherort findest du in `.voice-studio/session-location.json` im alten Anwendungsverzeichnis. Verwende das Verzeichnis, das `session.json` enthält, nicht die Datei selbst.

Die Vorgabe muss ein absolutes lokales Verzeichnis außerhalb des Anwendungs-Repositorys sein. Relative Pfade, Dateisystemwurzeln, Netzwerk- und Gerätepfade unter Windows sowie symbolische Links und Junctions werden abgewiesen. Setze die Variable in einem privaten Startskript oder einer Dienstkonfiguration. Repository-Konfiguration und HTTP-Anfragen können sie nicht festlegen. Ohne die Variable leitet Studio sein privates Standardverzeichnis weiterhin aus dem Anwendungspfad ab und legt es unter den lokalen Anwendungsdaten des Benutzers ab.

Beende den bisherigen Studio-Prozess, bevor du die verschobene Anwendung mit demselben privaten Verzeichnis startest. Die bestehenden Verzeichnisberechtigungen und die exklusive Instanzsperre gelten weiterhin. Behalte das Verzeichnis und den App-Origin bei: Der Name des Browser-Cookies enthält die Identität des privaten Verzeichnisses. Das Kopieren von `trusted-browsers.json` in ein anderes Verzeichnis erhält diese Identität nicht. Ein fortgesetzter Browserzugang behält seinen ursprünglichen Ablaufzeitpunkt und erhält einen neuen Bearer-Token im Arbeitsspeicher. Beim Start schreibt Studio einen neuen Verweis `session-location.json` in das neue Anwendungsverzeichnis.

Verschiebe das gesonderte Projektregister `.voice-studio/projects.json`, während Studio beendet ist. Erhalte die Projekt-IDs und aktualisiere vor dem ersten Start die Wurzelpfade verschobener Quellprojekte. Ihre Verzeichnisse `.voice-lint/` enthalten gespeicherte Reviews, Aufgaben und Vorschläge und müssen bei den Quellen bleiben. Externe Quellprojekte behalten ihre bisherigen Pfade. Private Prüfprofile in `checks.json` des beibehaltenen Sitzungsverzeichnisses verwenden absolute Werte für `projectPath`. Aktualisiere vor dem Neustart ausschließlich die Pfade der verschobenen Projekte.

## HTTP-Vertrag

| Anfrage | Eingabe und Ergebnis |
| --- | --- |
| `POST /api/session/pair` | `{ code, remember }`; gibt `{ token, remembered, expiresAt }` zurück und speichert auf Wunsch den Browserzugang |
| `POST /api/session/resume` | Gespeichertes Sitzungscookie; gibt einen gültigen Bearer-Token und den ursprünglichen Ablaufzeitpunkt zurück. Bei fehlendem, abgelaufenem oder widerrufenem Browserzugang lautet die Antwort HTTP 200 `{ paired: false }` |
| `POST /api/session/logout` | Widerruft die Zugangsdaten dieses Browsers und den zugehörigen aktiven Bearer-Token; lässt das Cookie ablaufen |

Fortsetzen, Abmelden und Koppeln mit `remember: true` erfordern den genauen lokalen `Origin` und `X-Voice-Studio-Session: 1`. Temporäres Koppeln über die CLI mit `remember: false` funktioniert auch ohne diese Browser-Header. Eine Seite unter einem fremden Origin kann die Sitzung nicht allein durch das Senden des Cookies fortsetzen oder widerrufen. Gewöhnliche Projekt-APIs verlangen einen Bearer-Token. Der bestehende private CLI-Installationstoken funktioniert für lokale Werkzeuge weiterhin; er wird weder in einem Browser-Cookie gespeichert noch in Prüfnachweisen veröffentlicht.

Die Oberfläche setzt die Sitzung beim Start fort. Wird ein Token ungültig, darf ein Lesezugriff die Sitzung fortsetzen und einmal wiederholt werden. Schreibzugriffe und Modellstarts werden **nie automatisch wiederholt**. Bei einem eindeutigen Authentifizierungsfehler kehrt die Oberfläche zur Kopplung zurück. Prüfungen der Sitzungsgeneration verhindern, dass eine verspätete Antwort auf eine ältere Anfrage eine neuere Anmeldung löscht.

## Prüfung und Geltungsbereich

Die Offline-Backend-Tests decken Kopplung, Cookie-Beschränkungen, Origin-Bindung, festen Ablaufzeitpunkt, Beständigkeit nach Neustart und Widerruf ab. Sie prüfen auch ein geändertes Anwendungsverzeichnis bei ausdrücklich beibehaltenem privatem Sitzungsverzeichnis. Tests des UI-Zustands prüfen Fortsetzen, den Umgang mit nicht autorisierten Antworten und konkurrierende verspätete Antworten.

```sh
npm run test:session
npm run test:session-ui
npm run test:browser-session
```

Das Szenario im echten Chrome verwendet ein isoliertes Browserprofil und prüft vollständiges Schließen und Wiederöffnen, Neuladen, einen neuen Tab, Abmelden, die Abweisung fremder Origins und den temporären Modus. Es schreibt keine Projektquellen, erstellt keinen Vorschlag und startet kein Modell. Damit ist der getestete lokale Chrome-Ablauf nachgewiesen; andere Browser und ein gehosteter Dienst sind damit nicht qualifiziert.
