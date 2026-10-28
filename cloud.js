/* MSAL Browser uses authorization code flow with PKCE; no client secret. */
(() => {
  'use strict';
  const REDIRECT = 'https://ydz4dby7rv-maker.github.io/Zeiteefassung-K1/';
  const scopes = ['https://graph.microsoft.com/Files.ReadWrite.AppFolder'];
  const $ = id => document.getElementById(id);
  let client, busy = false;
  const state = text => { $('cloudState').textContent = text; };
  function controls() {
    const account = client?.getActiveAccount();
    $('cloudLogin').disabled = busy || !client;
    $('cloudTest').disabled = busy || !account;
    $('cloudLogout').disabled = busy || !account;
    $('cloudAccount').textContent = account ? `Angemeldet: ${account.username || account.name || 'Microsoft-Konto'}` : 'Nicht angemeldet';
    window.dispatchEvent(new Event('k1-cloud-ready'));
  }
  function errorText(error) {
    const code = error.errorCode || error.code;
    if (['user_cancelled', 'access_denied'].includes(code)) return 'Anmeldung abgebrochen oder Berechtigung nicht erteilt.';
    if (code === 'interaction_required') return 'Bitte erneut anmelden und die App-Ordner-Berechtigung bestätigen.';
    if (error.graphStatus) return `OneDrive-Anfrage fehlgeschlagen (HTTP ${error.graphStatus}). Bei 401 erneut anmelden; bei 403 die delegierte AppFolder-Berechtigung prüfen; bei 404 OneDrive einmal im Browser einrichten.`;
    return `Vorgang fehlgeschlagen${code ? ` (${String(code).replace(/[^a-z0-9_-]/gi, '').slice(0,80)})` : ''}. Internetverbindung und App-Registrierung prüfen und erneut versuchen.`;
  }
  async function run(action) {
    if (busy) return;
    busy = true; controls();
    try { await action(); } catch (error) { state(errorText(error)); }
    finally { busy = false; controls(); }
  }
  async function graph(path, token, options = {}) {
    // Only fixed Graph-origin paths are accepted. Never follow a server-supplied URL with a bearer token.
    if (!path.startsWith('/me/drive/')) throw Error('Invalid Graph path');
    const response = await fetch('https://graph.microsoft.com/v1.0' + path, {
      ...options, cache: 'no-store', redirect: 'error',
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) { const error = Error('Graph request failed'); error.graphStatus = response.status; throw error; }
    return response;
  }
  $('cloudLogin').onclick = () => run(async () => {
    state('Microsoft-Anmeldung wird geöffnet …');
    await client.loginRedirect({ scopes, prompt: 'select_account' });
  });
  $('cloudLogout').onclick = () => run(async () => {
    await client.logoutRedirect({ account: client.getActiveAccount(), postLogoutRedirectUri: REDIRECT });
  });
  $('cloudTest').onclick = () => run(async () => {
    state('App-Ordner wird geprüft …');
    let auth;
    try { auth = await client.acquireTokenSilent({ scopes, account: client.getActiveAccount() }); }
    catch (error) {
      if (error instanceof msal.InteractionRequiredAuthError) {
        await client.acquireTokenRedirect({ scopes, account: client.getActiveAccount() }); return;
      }
      throw error;
    }
    const token = auth.accessToken;
    const root = await (await graph('/me/drive/special/approot', token)).json();
    const nonce = crypto.randomUUID();
    const filename = `k1-connection-test-${nonce}.json`;
    const folder = `/me/drive/items/${encodeURIComponent(root.id)}`;
    const expected = JSON.stringify({ type: 'k1-connection-test', version: 1, nonce, createdAt: new Date().toISOString() });
    let item, verified = false;
    try {
      // UUID + conflictBehavior=fail prevents replacing any existing file.
      item = await (await graph(`${folder}:/${filename}:/content?%40microsoft.graph.conflictBehavior=fail`, token, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: expected
      })).json();
      state('Testdatei geschrieben; Inhalt wird zurückgelesen …');
      // Graph /content redirects to a short-lived download URL. Fetch that URL WITHOUT Authorization.
      const metadata = await (await graph(`/me/drive/items/${encodeURIComponent(item.id)}`, token)).json();
      const url = new URL(metadata['@microsoft.graph.downloadUrl']);
      if (url.protocol !== 'https:') throw Error('Unsafe download URL');
      const read = await fetch(url.href, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(30000) });
      if (!read.ok || await read.text() !== expected) throw Error('Verification failed');
      verified = true;
    } finally {
      if (item?.id) {
        try {
          // Delete only the newly created item, and only if its version is unchanged.
          if (!item.eTag) throw Error('Missing ETag');
          await graph(`/me/drive/items/${encodeURIComponent(item.id)}`, token, { method: 'DELETE', headers: { 'If-Match': item.eTag } });
        } catch {
          state(`${verified ? 'Lesen und Schreiben erfolgreich.' : 'Test nicht vollständig bestätigt.'} Bereinigung nicht bestätigt: ${filename} kann im OneDrive-App-Ordner verblieben sein. Keine Zeitdaten übertragen.`);
          return;
        }
      } else {
        state(`Schreibtest nicht bestätigt. Bei einer Verbindungsunterbrechung kann ${filename} im App-Ordner verblieben sein. Erneut testen. Keine Zeitdaten übertragen.`);
        return;
      }
    }
    state('Verbindungstest erfolgreich: geschrieben, identisch zurückgelesen und Testdatei gelöscht. Keine Zeitdaten übertragen. Automatische Synchronisierung bleibt aus.');
  });
  window.K1Cloud = {
    account: () => busy ? null : client?.getActiveAccount(),
    lock() {
      if (busy) throw Error('Ein Microsoft-Vorgang läuft bereits.');
      busy = true; controls();
      return () => { busy = false; controls(); };
    },
    graph,
    async token() {
      try { return (await client.acquireTokenSilent({ scopes, account: client.getActiveAccount() })).accessToken; }
      catch (error) {
        if (error instanceof msal.InteractionRequiredAuthError) {
          await client.acquireTokenRedirect({ scopes, account: client.getActiveAccount() }); return null;
        }
        throw error;
      }
    }
  };
  (async () => {
    controls();
    if (location.origin + location.pathname !== REDIRECT) {
      state('Anmeldung nur unter der eingerichteten GitHub-Pages-Adresse verfügbar: ' + REDIRECT); return;
    }
    try {
      if (!window.msal) throw Error('MSAL unavailable');
      client = new msal.PublicClientApplication({ auth: {
        clientId: 'd0b6f1ea-d79a-433c-83b9-3d89c3124d1d',
        authority: 'https://login.microsoftonline.com/consumers', redirectUri: REDIRECT,
        postLogoutRedirectUri: REDIRECT, navigateToLoginRequestUrl: false
      }, cache: { cacheLocation: 'sessionStorage' } });
      await client.initialize();
      const result = await client.handleRedirectPromise();
      if (result?.account) client.setActiveAccount(result.account);
      else if (!client.getActiveAccount() && client.getAllAccounts().length === 1) client.setActiveAccount(client.getAllAccounts()[0]);
      state(client.getActiveAccount() ? 'Angemeldet. Verbindungstest kann gestartet werden. Automatische Synchronisierung ist aus.' : 'Lokale Speicherung aktiv. Melde dich für den OneDrive-Verbindungstest an.');
    } catch (error) { client = null; state(errorText(error)); }
    controls();
  })();
})();
