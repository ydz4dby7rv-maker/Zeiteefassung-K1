/* Immutable revision graph: no wall-clock winner and no mutable shared cloud file. */
(() => {
  'use strict';
  function fail(message) { throw Error(message); }
  function entry(value) {
    if (value === null) return null;
    if (!value || typeof value.id !== 'string' || !value.id || value.id.length > 200 ||
        !Number.isSafeInteger(value.start) || !Number.isSafeInteger(value.end) ||
        value.start < 0 || value.end <= value.start || value.end > 8640000000000000 ||
        typeof value.note !== 'string' || value.note.length > 100000 ||
        (value.project !== undefined && !['kilometer1','schule','kitablick'].includes(value.project))) fail('Ungültiger Zeiteintrag. Abgleich abgebrochen.');
    return { id: value.id, start: value.start, end: value.end, note: value.note, project: value.project || 'kilometer1' };
  }
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  function entries(values) {
    if (!Array.isArray(values) || values.length > 10000) fail('Ungültige oder zu große Eintragsliste.');
    const map = new Map();
    for (const value of values) { const e = entry(value); if (!e || map.has(e.id)) fail('Doppelte Eintrags-ID.'); map.set(e.id,e); }
    return map;
  }
  function revisions(values) {
    if (!Array.isArray(values) || values.length > 30000) fail('Zu viele Änderungen für diesen Abgleich.');
    const map = new Map();
    for (const raw of values) {
      if (!raw || typeof raw.rev !== 'string' || !/^[\da-f-]{36}$/i.test(raw.rev) || typeof raw.id !== 'string' || !raw.id || raw.id.length > 200 ||
          !Array.isArray(raw.parents) || raw.parents.length > 200 || raw.parents.some(p=>typeof p !== 'string') || new Set(raw.parents).size !== raw.parents.length) fail('Ungültige Synchronisierungsdatei.');
      const value = entry(raw.value);
      if (value && value.id !== raw.id) fail('Eintrags-ID stimmt nicht überein.');
      const op = { rev: raw.rev, id: raw.id, parents: [...raw.parents].sort(), value };
      if (map.has(op.rev) && !same(map.get(op.rev),op)) fail('Widersprüchliche Änderungs-ID.');
      map.set(op.rev,op);
    }
    return map;
  }
  function heads(map) {
    const grouped = new Map(), removed = new Set();
    for (const op of map.values()) {
      for (const parent of op.parents) {
        if (!map.has(parent) || map.get(parent).id !== op.id) fail('Änderungshistorie unvollständig. Keine Daten wurden ersetzt.');
        removed.add(parent);
      }
      if (!grouped.has(op.id)) grouped.set(op.id,[]);
      grouped.get(op.id).push(op);
    }
    // Kahn traversal also rejects cycles from damaged or manually edited files.
    const children = new Map(), degree = new Map();
    for (const op of map.values()) {
      degree.set(op.rev,op.parents.length);
      for (const p of op.parents) { if (!children.has(p)) children.set(p,[]); children.get(p).push(op.rev); }
    }
    const queue = [...degree].filter(([,d])=>d===0).map(([r])=>r);
    for (let i=0;i<queue.length;i++) for (const c of children.get(queue[i]) || []) { degree.set(c,degree.get(c)-1); if (!degree.get(c)) queue.push(c); }
    if (queue.length !== map.size) fail('Ungültiger Zyklus in der Änderungshistorie.');
    for (const [id,ops] of grouped) grouped.set(id,ops.filter(op=>!removed.has(op.rev)).sort((a,b)=>a.rev.localeCompare(b.rev)));
    return grouped;
  }
  function stage(local, baseline, known, uuid) {
    const current = entries(local), base = entries(baseline), map = revisions(known), currentHeads = heads(map), added = [];
    for (const id of new Set([...current.keys(),...base.keys()])) {
      const value = current.get(id) || null;
      if (same(value,base.get(id) || null)) continue;
      const op = { rev: uuid(), id, parents: (currentHeads.get(id)||[]).map(o=>o.rev).sort(), value };
      map.set(op.rev,op); added.push(op);
    }
    return { ops: [...map.values()], added };
  }
  function merge(known, remote) {
    const map = revisions([...known,...remote]), grouped = heads(map), resolved = [], conflicts = [];
    for (const [id,ops] of grouped) {
      if (ops.every(op=>same(op.value,ops[0].value))) { if (ops[0].value) resolved.push(ops[0].value); }
      else conflicts.push({id,options:ops});
    }
    return { ops:[...map.values()], resolved, conflicts };
  }
  window.K1SyncCore = { entry, entries, same, revisions, heads, stage, merge };
})();
