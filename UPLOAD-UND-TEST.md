# Kilometer1 – GitHub Pages, Version 2026-10-28

## Upload
1. Vorher in der bisherigen App eine JSON-Sicherung exportieren. Lokaler Speicher wird unter demselben Browser, derselben Domain und demselben Schlüssel `k1_timesheet_v1` weiterverwendet. Bei Geräte-/Browserwechsel Sicherung importieren.
2. ZIP entpacken und den gesamten Inhalt einschließlich `vendor/`, Icons und `sw.js` in den Veröffentlichungsordner des GitHub-Repositories `Zeiteefassung-K1` hochladen. `index.html` liegt direkt dort, nicht in einem zusätzlichen Unterordner.
3. GitHub → Settings → Pages: den gewünschten Branch und diesen Ordner als Quelle auswählen. Nach abgeschlossenem Deployment https://ydz4dby7rv-maker.github.io/Zeiteefassung-K1/ öffnen (Schreibweise und abschließenden Schrägstrich beibehalten).
4. Alte App-Tabs schließen und Seite online erneut öffnen. Bei alter Anzeige einmal hart neu laden; alternativ nur den alten Service Worker entfernen und neu laden. **Website-Daten/lokalen Speicher nicht löschen**, sonst gehen lokale Zeiten verloren.

## Microsoft-Registrierung prüfen
- Client-ID: `d0b6f1ea-d79a-433c-83b9-3d89c3124d1d`.
- Unterstützte Konten: persönliche Microsoft-Konten (oder eine Einstellung, die persönliche Konten einschließt). Die App verwendet ausschließlich Authority `https://login.microsoftonline.com/consumers`.
- Authentication → Add a platform → **Single-page application (SPA)**. Redirect-URI exakt `https://ydz4dby7rv-maker.github.io/Zeiteefassung-K1/`.
- Microsoft Graph → **delegierte** Berechtigung `Files.ReadWrite.AppFolder`. Keine breiteren Dateirechte notwendig. Zustimmung bei Anmeldung erteilen.
- Kein Client-Secret anlegen/einbauen. Implizite Token-Ausgabe ist für MSAL SPA/PKCE nicht erforderlich.

## Kurzer Funktionstest
1. Vorhandene Einträge prüfen. Timer starten, pausieren, fortsetzen und abschließen; Tabelle und JSON-Export prüfen. Wochenlimit bleibt 330 Minuten mit Warnung ab 300 Minuten. Manuelle Korrekturen können weiterhin über dem Budget liegen.
2. „Mit Microsoft anmelden“ → persönliches Konto wählen → Zustimmung erteilen. Nach Rückkehr wird das angemeldete Konto angezeigt.
3. „Lesen / Schreiben testen“ anklicken. Erfolg bedeutet: neue UUID-Testdatei im App-Ordner geschrieben, Inhalt identisch gelesen, Datei mit ETag-Schutz gelöscht. Vorhandene Dateien und lokale Zeiten werden nicht verändert. Bei Netzunterbrechung kann eine Datei `k1-connection-test-….json` verbleiben; die App meldet dies. Nur diese Testdatei bei Bedarf manuell entfernen.
4. Abmelden prüfen; Timer bleibt nutzbar. Online einmal vollständig laden, danach offline neu öffnen und Timer/Einträge prüfen. Anmeldung und OneDrive-Test benötigen Internet.

## Grenzen und technische Hinweise
Keine automatische Zeitsynchronisierung, kein Upload von Zeitdateien, keine Offline-Warteschlange. Geräteabgleich weiterhin über JSON-Sicherungen. Vor echter Synchronisierung sind ETag-/If-Match-Konfliktbehandlung und ein Konzept für parallele Timer erforderlich.

MSAL Browser 4.29.0 ist fest eingebunden (`vendor/`, MIT-Lizenz beiliegend); keine CDN-Abhängigkeit. Tokenverwaltung durch MSAL im Sitzungsspeicher; keine Tokenausgabe in Oberfläche/Logs. Graph-Download erfolgt ohne Authorization-Header zur kurzlebigen Downloadadresse. Der Service Worker speichert nur bekannte gleichursprüngliche App-Dateien, keine Graph-/Anmeldeantworten. Neuer Cache: `kilometer1-shell-20261028-msal-1`.

Die ZIP wurde lokal mit simulierten Microsoft-/Graph-Antworten geprüft. Eine echte Anmeldung, Zustimmung und OneDrive-Schreibberechtigung müssen nach dem Deployment mit deinem Konto geprüft werden; die Entra-Konfiguration wurde nicht verändert.

Referenzen: https://learn.microsoft.com/en-us/entra/msal/javascript/browser/about-msal-browser und https://learn.microsoft.com/en-us/graph/onedrive-sharepoint-appfolder
