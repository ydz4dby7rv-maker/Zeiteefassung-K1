# Kilometer1 PWA – OneDrive-Vorbereitung

## Stand
Die PWA ist installierbar und speichert **nur lokal im jeweiligen Browser**. OneDrive ist noch nicht verbunden. Kein Geräteabgleich! Die lokale HTML-App und die neue Webadresse teilen nicht automatisch denselben lokalen Speicher. Vor einem Umzug alte JSON-Sicherung exportieren und in der neuen App importieren.

## Bereitstellung
1. Den **Inhalt** dieses Ordners auf einen HTTPS-Host laden (z. B. GitHub Pages). `index.html` muss im Stammordner liegen.
2. URL auf Handy und Computer öffnen. Über Browser-Menü **Zum Startbildschirm hinzufügen** bzw. **App installieren** wählen.
3. Link in Microsoft Loop einfügen.
4. Regelmäßig JSON-Sicherungen exportieren. Offline-Zugriff ist nach dem ersten erfolgreichen Online-Aufruf möglich, aber Browser können Speicher löschen.

## Für OneDrive-Synchronisierung noch nötig
- Microsoft-Entra-App-Registrierung für **persönliche Microsoft-Konten** (bisher nicht möglich mit deinem Konto).
- Plattform: **Single-page application** mit exakt der veröffentlichten HTTPS-URL als Redirect-URI.
- Client-ID (öffentlich, kein Client-Secret in der PWA), MSAL Browser mit PKCE, Authority `https://login.microsoftonline.com/consumers`.
- Microsoft Graph delegierte Berechtigung `Files.ReadWrite.AppFolder` nach Prüfung der Unterstützung im persönlichen OneDrive; möglichst keine breiteren Dateiberechtigungen.
- Synchronisierung mit ETag/If-Match gegen Überschreiben, Konfliktbehandlung, Offline-Warteschlange und einheitlichem aktiven Timer; erst nach Tests aktivieren.
- Microsoft Graph App-Ordner: `/me/drive/special/approot`; Datei z. B. `kilometer1.json`.

**Wichtig:** Keine Zugangsdaten oder Geheimnisse in HTML/JavaScript eintragen. Diese Vorbereitung ist **keine fertige OneDrive-Anbindung**.
