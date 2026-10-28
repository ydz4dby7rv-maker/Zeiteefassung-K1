(() => {
  'use strict';
  const $ = id=>document.getElementById(id), core = window.K1SyncCore;
  const PREFIX = 'k1-sync-v2-', MAX_BYTES = 4*1024*1024;
  let busy = false;
  const status = text=>{ $('syncState').textContent=text; };
  function controls() { $('cloudSync').disabled = busy || !window.K1Cloud?.account(); }
  window.addEventListener('k1-cloud-ready',controls);
  function describe(value) {
    if (!value) return 'Eintrag gelöscht';
    return `${({kilometer1:'Kilometer1',schule:'Schule',kitablick:'KitaBlick'})[value.project||'kilometer1']} · ${new Date(value.start).toLocaleString('de-DE')} – ${new Date(value.end).toLocaleString('de-DE')} · ${Math.round((value.end-value.start)/60000)} Min. · ${value.note || 'ohne Notiz'}`;
  }
  function resolve(conflicts, local) {
    const dialog=$('syncDialog'), list=$('syncConflicts'); list.replaceChildren();
    const selections=[];
    for (const conflict of conflicts) {
      const box=document.createElement('div');box.className='card';
      const label=document.createElement('p');label.textContent='Welche Fassung soll für diesen Eintrag gelten?';box.append(label);
      const select=document.createElement('select');select.setAttribute('aria-label','Fassung des Eintrags auswählen');
      const initial=document.createElement('option');initial.value='';initial.textContent='Bitte eine Fassung auswählen …';select.append(initial);
      conflict.options.forEach((op,i)=>{ const option=document.createElement('option');option.value=String(i);
        const matches=core.same(op.value,local.get(conflict.id)||null);
        const title=`Fassung ${i+1}${matches?' · Auf diesem Gerät':''}`;
        const description=document.createElement('p');description.textContent=title+': '+describe(op.value);box.append(description);
        option.textContent=title;select.append(option); });
      box.append(select);list.append(box);selections.push(select);
    }
    return new Promise(resolve=>{
      function finish(value) { dialog.close();dialog.oncancel=null;$('syncAccept').onclick=null;$('syncCancel').onclick=null;resolve(value); }
      $('syncAccept').onclick=()=>{
        if(selections.some(s=>s.value==='')) { $('syncDialogMessage').textContent='Bitte bei jedem Konflikt eine Fassung wählen.';return; }
        finish(conflicts.map((conflict,i)=>({ rev:crypto.randomUUID(),id:conflict.id,parents:conflict.options.map(o=>o.rev).sort(),value:conflict.options[Number(selections[i].value)].value })));
      };
      $('syncCancel').onclick=()=>finish(null);dialog.oncancel=e=>{e.preventDefault();finish(null);};
      $('syncDialogMessage').textContent='Es wurden unterschiedliche Änderungen am selben Eintrag gefunden. Es ist keine Fassung vorausgewählt. Abbrechen lässt deine Zeiten unverändert.';
      dialog.showModal();
    });
  }
  async function download(item,token,graph) {
    // Get fresh metadata to avoid using expired pre-authenticated download URLs.
    const metadata=await (await graph(`/me/drive/items/${encodeURIComponent(item.id)}`,token)).json();
    if (!Number.isFinite(metadata.size) || metadata.size>MAX_BYTES) throw Error('Eine Synchronisierungsdatei ist zu groß oder ungültig.');
    const url=new URL(metadata['@microsoft.graph.downloadUrl']);if(url.protocol!=='https:')throw Error('Unsichere Downloadadresse.');
    const response=await fetch(url.href,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('Cloud-Datei konnte nicht gelesen werden.');
    const text=await response.text();if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Cloud-Datei zu groß.');
    const body=JSON.parse(text);
    if(body.format!=='k1-sync-journal'||body.version!==2||!Array.isArray(body.ops))throw Error('Unbekanntes Synchronisierungsformat.');
    return [...core.revisions(body.ops).values()];
  }
  async function readRemote(root,token,graph) {
    let path=`/me/drive/items/${encodeURIComponent(root.id)}/children?$top=200`,count=0,totalBytes=0;const ops=[];
    while(path) {
      const page=await (await graph(path,token)).json();
      if(!Array.isArray(page.value))throw Error('Ungültige OneDrive-Antwort.');
      for(const item of page.value) {
        if(!item.name?.startsWith(PREFIX)||!item.name.endsWith('.json'))continue;
        if(!item.file||!Number.isFinite(item.size)||item.size>MAX_BYTES)throw Error('Ungültige Synchronisierungsdatei im App-Ordner.');
        totalBytes+=item.size;if(++count>1000||totalBytes>20*1024*1024)throw Error('Cloud-Historie zu groß. Bitte zuerst JSON-Sicherung exportieren.');
        ops.push(...await download(item,token,graph));
        if(ops.length>60000)throw Error('Zu große Änderungshistorie.');
      }
      path=null;
      if(page['@odata.nextLink']) {
        const next=new URL(page['@odata.nextLink']);
        if(next.origin!=='https://graph.microsoft.com'||!next.pathname.startsWith('/v1.0/me/drive/'))throw Error('Ungültige Folgeseite.');
        path=next.pathname.slice('/v1.0'.length)+next.search;
      }
    }
    return [...core.revisions(ops).values()];
  }
  $('cloudSync').onclick=async()=>{
    if(busy||!window.K1Cloud?.account())return;
    busy=true;controls();let store,unlockCloud;
    try {
      const owner=window.K1Cloud.account().homeAccountId;
      if(!owner)throw Error('Microsoft-Konto nicht eindeutig erkannt. Bitte erneut anmelden.');
      unlockCloud=window.K1Cloud.lock();
      store=window.K1Store.lock();
      let snapshot=store.read();
      if(snapshot.sync?.owner&&snapshot.sync.owner!==owner)throw Error('Diese lokalen Zeiten sind mit einem anderen Microsoft-Konto verknüpft. Bitte mit dem ursprünglichen Konto anmelden.');
      if(!snapshot.sync && !confirm(`Abgeschlossene Arbeitszeiten dieses Geräts mit dem angemeldeten Microsoft-Konto verknüpfen? Beim Synchronisieren werden sie in dessen OneDrive-App-Ordner übertragen. Vorher bitte eine JSON-Sicherung erstellen.`)) {status('Abgleich abgebrochen.');return;}
      const previous=snapshot.sync||{owner,ops:[],baseline:[]};
      if(!Array.isArray(previous.ops)||!Array.isArray(previous.baseline))throw Error('Lokaler Synchronisierungsstand ungültig.');
      const staged=core.stage(snapshot.entries,previous.baseline,previous.ops,()=>crypto.randomUUID());
      // Persist revisions before any upload: retries after a lost response reuse the same revision IDs.
      snapshot=store.write({...snapshot,sync:{...previous,owner,ops:staged.ops,baseline:snapshot.entries}});
      status('OneDrive-Änderungen werden gelesen …');
      const token=await window.K1Cloud.token();if(!token){status('Bitte Anmeldung abschließen und danach erneut synchronisieren.');return;}
      const graph=window.K1Cloud.graph;
      const root=await (await graph('/me/drive/special/approot',token)).json();
      const remote=await readRemote(root,token,graph);store.check();
      let merged=core.merge(staged.ops,remote);
      if(merged.conflicts.length) {
        status(`${merged.conflicts.length} Konflikt(e) benötigen deine Auswahl.`);
        const decisions=await resolve(merged.conflicts,core.entries(snapshot.entries));
        if(!decisions){status('Abgleich abgebrochen. Keine Cloud-Datei geschrieben; lokale Zeiten unverändert.');return;}
        store.check();merged=core.merge([...merged.ops,...decisions],[]);
      }
      const remoteMap=core.revisions(remote),pending=merged.ops.filter(op=>!remoteMap.has(op.rev));
      // Persist selected resolutions too, so ambiguous network failures never lose a decision.
      snapshot=store.write({...snapshot,sync:{...snapshot.sync,ops:merged.ops}});
      if(pending.length) {
        const body=JSON.stringify({format:'k1-sync-journal',version:2,ops:pending});
        if(new TextEncoder().encode(body).length>MAX_BYTES)throw Error('Zu viele Änderungen für einen Abgleich. Keine Cloud-Datei geschrieben.');
        const filename=PREFIX+crypto.randomUUID()+'.json';
        status('Änderungen werden in einer neuen Cloud-Datei gespeichert …');store.check();
        // Immutable UUID-named batches: no existing batch is ever updated or deleted.
        const item=await (await graph(`/me/drive/items/${encodeURIComponent(root.id)}:/${filename}:/content?%40microsoft.graph.conflictBehavior=fail`,token,{
          method:'PUT',headers:{'Content-Type':'application/json'},body
        })).json();
        const verified=await download(item,token,graph);
        const uploaded=core.revisions(pending),checked=core.revisions(verified);
        if(uploaded.size!==checked.size||[...uploaded].some(([id,op])=>!core.same(op,checked.get(id))))throw Error('Cloud-Schreibvorgang konnte nicht bestätigt werden. Bitte erneut synchronisieren.');
      }
      store.check();
      const nextEntries=merged.resolved.sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
      // A single localStorage write commits entries, baseline and history together.
      store.backup();
      store.write({...snapshot,entries:nextEntries,sync:{...snapshot.sync,baseline:nextEntries,ops:merged.ops,lastSync:new Date().toISOString()}});
      status(`Synchronisiert: ${nextEntries.length} Einträge · ${new Date().toLocaleString('de-DE')}. Vor dem Gerätewechsel auf dem anderen Gerät ebenfalls synchronisieren.`);
    } catch(error) {
      status(error.graphStatus ? `OneDrive-Fehler (HTTP ${error.graphStatus}). Zeiten bleiben lokal erhalten. Bitte später erneut synchronisieren; bei 401/403 Anmeldung und Berechtigung prüfen.` : `${error.message || 'Abgleich fehlgeschlagen.'} Zeiten bleiben lokal erhalten. Erneutes Synchronisieren ist möglich.`);
    } finally {store?.release();unlockCloud?.();busy=false;controls();}
  };
  $('syncBackup').onclick=()=>{
    const raw=localStorage.getItem('k1_before_sync_v2');
    if(!raw){status('Noch keine Sicherung vor einem abgeschlossenen Abgleich vorhanden.');return;}
    const data=JSON.parse(raw),url=URL.createObjectURL(new Blob([JSON.stringify({format:'k1-timesheet',version:1,entries:data.entries},null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='K1_vor_letztem_Abgleich.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
  };
  controls();
})();
