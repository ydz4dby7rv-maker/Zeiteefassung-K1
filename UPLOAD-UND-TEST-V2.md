# Zeiterfassung 2.1 – Kilometer1, Schule und KitaBlick

## Upload
1. Vorher auf jedem Gerät eine **Sicherung (JSON)** exportieren und offene Einheiten abschließen.
2. ZIP entpacken und den gesamten Inhalt in das Hauptverzeichnis des GitHub-Repositorys `Zeiteefassung-K1` hochladen. Vorhandene Dateien ersetzen; den Ordner **vendor** als Ordner beibehalten.
3. Direkt im Hauptverzeichnis: `index.html`, `cloud.js`, `sync.js`, `sync-core.js`, `sw.js`, `favicon.svg`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `.nojekyll`. Im Ordner `vendor`: `msal-browser.min.js` und `MSAL-LICENSE.txt`.
4. GitHub Pages bleibt auf `main` und `/ (root)`. Veröffentlichung abwarten, alte App-Tabs schließen und https://ydz4dby7rv-maker.github.io/Zeiteefassung-K1/ neu öffnen. Am Computer Strg+F5. Oben muss die Bereichsauswahl erscheinen, unter OneDrive der Knopf **Synchronisieren**.
5. **Keine Website-Daten löschen.** Der bisherige lokale Speicher bleibt erhalten. Bestehende Einträge ohne Bereich zählen zu Kilometer1. Alte Homescreen-Symbole aktualisieren sich eventuell erst beim erneuten Anlegen der Verknüpfung. Safari, Chrome und Homescreen-App können getrennte lokale Speicher verwenden; jeweils anmelden und synchronisieren.

## Drei Bereiche
- Oben Kilometer1, Schule oder KitaBlick auswählen. Timer, Nachträge, Übersicht, Wochen-/Monatswerte und CSV beziehen sich auf den gewählten Bereich.
- **Kilometer1:** Warnung bei 5 Stunden, automatische Timerpause bei 5 h 30 min pro Woche. **Schule und KitaBlick: kein Limit.** Manuelle Nachträge/Korrekturen können das Kilometer1-Budget überschreiten.
- Offene Einheiten vor Bereichswechsel und Abgleich abschließen. Einträge lassen sich beim Bearbeiten einem anderen Bereich zuordnen.
- JSON-Sicherung: alle Bereiche. CSV: ausgewählter Bereich und Zeitraum, einschließlich Bereichsspalte.

## Geräteabgleich
1. Am Computer mit deinem persönlichen Microsoft-Konto anmelden, **Synchronisieren** klicken und die erstmalige Verknüpfung mit diesem Konto bestätigen.
2. Am iPhone mit **demselben Konto** anmelden und ebenfalls synchronisieren. Es werden immer alle drei Bereiche abgeglichen.
3. Vor dem Arbeiten auf einem anderen Gerät dort synchronisieren. Nach der Arbeit Einheit abschließen und wieder synchronisieren. Nur auf einem Gerät gleichzeitig arbeiten: Laufende Timer werden nicht übertragen; das Wochenbudget kennt nur die bislang abgeglichenen Zeiten.
4. Wenn beide Geräte gleichzeitig abgeglichen haben, nach Abschluss auf beiden nochmals synchronisieren, damit auch später eingetroffene Änderungen sichtbar werden.
5. Offline lokal weiterarbeiten und später manuell synchronisieren. Es gibt keinen automatischen Hintergrundabgleich.

Neue Einträge werden zusammengeführt. Widersprüchliche Fassungen desselben Eintrags, einschließlich Bearbeitung gegen Löschung oder Bereichswechsel, werden zur Auswahl angezeigt. Es gibt keine vorausgewählte Gewinnerfassung. Abbrechen lässt die lokale Eintragsliste unverändert und lädt in diesem Durchgang nichts Neues hoch. Verschiedene IDs gelten als verschiedene Einträge; überlappende Zeiträume werden nicht automatisch als Duplikate gelöscht.

Löschungen bleiben als Änderungsvermerke erhalten. Vor dem Übernehmen eines Abgleichs wird zusätzlich eine lokale Sicherung der bisherigen Einträge gespeichert; **Sicherung vor letztem Abgleich herunterladen** exportiert sie. Beim nächsten erfolgreichen Abgleich wird sie ersetzt. Eigene JSON-Sicherungen weiterhin regelmäßig erstellen. JSON-Import ergänzt fehlende IDs, überschreibt vorhandene IDs jedoch nicht.

## Speicherung und Sicherheit
Die Zeiten liegen lokal im Browser und nach dem Abgleich im OneDrive-App-Ordner: **Meine Dateien → Apps → Name deiner registrierten Microsoft-App**. Dateien heißen `k1-sync-v2-<zufällige ID>.json`.

Es werden ausschließlich neue Änderungsdateien erstellt und zurückgelesen, keine vorhandenen Synchronisierungsdateien überschrieben oder gelöscht. Die Historie erkennt parallele Änderungen ohne einen Gewinner nach Geräteuhr. Unklar bestätigte Uploads können wiederholt werden, ohne Zeiteinträge doppelt anzulegen. Der separate Verbindungstest löscht ausschließlich seine eigenen Testdateien mit ETag-Prüfung.

**Journaldateien nicht einzeln bearbeiten oder löschen:** Sie bilden gemeinsam die Historie. Es gibt noch keine Historienverdichtung. Der Abgleich stoppt bei ungültigen Dateien oder Größenlimits: maximal 1.000 Journaldateien, 20 MiB abgerufene Historie, 30.000 Revisionen. Die lokale Kontobindung verhindert einen versehentlichen Upload derselben Historie zu einem anderen Microsoft-Konto.

Anmeldung bleibt unverändert: Client-ID `d0b6f1ea-d79a-433c-83b9-3d89c3124d1d`, Authority `https://login.microsoftonline.com/consumers`, SPA-Redirect `https://ydz4dby7rv-maker.github.io/Zeiteefassung-K1/`, delegierte Berechtigung `Files.ReadWrite.AppFolder`. Keine neuen Berechtigungen oder Client-Secrets nötig. MSAL 4.29.0 liegt im Ordner `vendor`.

## Nach Upload testen
1. Vorhandene Kilometer1-Zeiten prüfen. Je einen Testeintrag für Schule und KitaBlick anlegen; die Übersichten müssen getrennt sein.
2. Auf Computer synchronisieren, anschließend auf iPhone. Beide Einträge in den passenden Bereichen prüfen.
3. Eine Testbearbeitung und eine Testlöschung abgleichen.
4. Optional denselben Testeintrag auf beiden Geräten unterschiedlich bearbeiten. Erst A, dann B synchronisieren: Auf B muss die Konfliktauswahl erscheinen. Fassung auswählen, abschließen, A nochmals synchronisieren.
5. Nach Netzfehler erneut synchronisieren. Vor Gerätewechsel immer abgleichen.

Lokal geprüft: Zusammenführung, Löschungen, Konfliktauswahl/-abbruch, Wiederholung nach Netzabbruch, Schutz gegen Änderungen aus anderem Tab, Kontobindung, Timer, 5,5-h-Limit und unbegrenzte Schule-/KitaBlick-Einheiten. Browserprüfung bei Desktop- und iPhone-Bildschirmbreite mit simuliertem Microsoft/OneDrive und tatsächlichem lokalen Speicher bestanden. Echten OneDrive-Abgleich und tatsächliches iPhone-Verhalten nach Deployment mit deinem Konto prüfen.

Neuer Cache: `kilometer1-shell-20261028-sync-2-1-clock`. Cloud-/Anmeldeantworten werden nicht gecacht. Uhr-Symbol für Favicon und Homescreen enthalten.
