// sync.jsx — backup e sincronizzazione su Supabase.
// Local-first: IndexedDB resta la fonte per la UI; il cloud è la copia di sicurezza.
// Ogni riga della tabella `concerti` è un concerto (payload completo, PDF incluso);
// le cancellazioni viaggiano come righe deleted=true (tombstone) per non far
// "risorgere" i concerti eliminati al merge successivo.

const SB_URL = 'https://bsrmrffhaqzfjeqealnm.supabase.co';
const SB_KEY = 'sb_publishable_y9u0TZd4MSPnscT-bZtrnw_1-aBNMov';
const sbClient = (typeof supabase !== 'undefined' && supabase.createClient)
  ? supabase.createClient(SB_URL, SB_KEY)
  : null; // CDN non raggiunto: l'app funziona comunque, solo senza backup

// ───────────────────────── Stato di sync (IndexedDB) ─────────────────────────
const META_KEY = 'concerti_meta_v1';
async function loadMeta() {
  const m = await idbGet(META_KEY).catch(() => null);
  return (m && typeof m === 'object') ? { tombstones: m.tombstones || {}, dirty: m.dirty || [] } : { tombstones: {}, dirty: [] };
}
function saveMeta(m) { return idbSet(META_KEY, m); }

// serializza le operazioni di sync per evitare push/merge sovrapposti
let syncQueue = Promise.resolve();
function enqueue(op) {
  syncQueue = syncQueue.then(op, op);
  return syncQueue;
}

const ts = (x) => (x ? Date.parse(x) || 0 : 0);

async function currentUser() {
  if (!sbClient) return null;
  const { data } = await sbClient.auth.getSession();
  return (data && data.session && data.session.user) || null;
}

// ───────────────────────── Motore ─────────────────────────
async function pushDirty(list) {
  if (!sbClient || !(await currentUser())) return;
  const meta = await loadMeta();
  if (!meta.dirty.length) return;
  const rows = [];
  for (const id of meta.dirty) {
    if (meta.tombstones[id]) {
      rows.push({ id, payload: {}, updated_at: meta.tombstones[id], deleted: true });
    } else {
      const c = list.find(x => x.id === id);
      if (c) {
        const stamped = c.updatedAt ? c : { ...c, updatedAt: new Date().toISOString() };
        rows.push({ id, payload: stamped, updated_at: stamped.updatedAt, deleted: false });
      }
    }
  }
  if (rows.length) {
    const { error } = await sbClient.from('concerti').upsert(rows, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
  meta.dirty = [];
  await saveMeta(meta);
}

// Pull + merge (vince il più recente per updatedAt) + push delle differenze.
// Ritorna la lista fusa, o null se non loggati.
async function fullSync(localList) {
  if (!sbClient || !(await currentUser())) return null;
  const meta = await loadMeta();
  const now = new Date().toISOString();

  const { data: index, error } = await sbClient.from('concerti').select('id, updated_at, deleted');
  if (error) throw error;

  // Nota: i concerti senza updatedAt (dati pre-sync o seed di un dispositivo nuovo)
  // hanno timestamp 0 nei confronti: contro una versione cloud perdono sempre,
  // così i dati di esempio non sovrascrivono mai quelli veri.
  const localById = new Map(localList.map(c => [c.id, c]));
  const result = new Map(localById);
  const markDirty = (id) => { if (!meta.dirty.includes(id)) meta.dirty.push(id); };
  const toFetch = [];

  for (const row of index) {
    const mine = localById.get(row.id);
    const tomb = meta.tombstones[row.id];
    const rowT = ts(row.updated_at);
    if (row.deleted) {
      if (mine && ts(mine.updatedAt) > rowT) markDirty(row.id); // modifica locale più recente: ripubblica
      else { result.delete(row.id); delete meta.tombstones[row.id]; }
    } else if (tomb && ts(tomb) > rowT) {
      markDirty(row.id); // cancellazione locale da propagare
    } else if (!mine || rowT > ts(mine.updatedAt)) {
      toFetch.push(row.id); // versione server più recente (o concerto nuovo)
      delete meta.tombstones[row.id];
    } else if (rowT < ts(mine.updatedAt)) {
      markDirty(row.id); // versione locale più recente
    }
  }

  const serverIds = new Set(index.map(r => r.id));
  for (const c of localList) {
    if (!serverIds.has(c.id)) {
      // mai visto dal server: timbra ora (se serve) e pubblica
      if (!c.updatedAt) result.set(c.id, { ...c, updatedAt: now });
      markDirty(c.id);
    }
  }
  for (const id of Object.keys(meta.tombstones)) {
    if (!serverIds.has(id)) { // mai arrivato al server: niente da cancellare lassù
      delete meta.tombstones[id];
      meta.dirty = meta.dirty.filter(d => d !== id);
    }
  }

  if (toFetch.length) {
    const { data: rows, error: e2 } = await sbClient.from('concerti').select('id, payload').in('id', toFetch);
    if (e2) throw e2;
    for (const r of rows) if (r.payload && r.payload.id) result.set(r.id, r.payload);
  }

  await saveMeta(meta);
  const merged = [...result.values()].sort((a, b) => ts(b.date) - ts(a.date));
  await pushDirty(merged);
  return merged;
}

// ───────────────────────── Hook per l'App ─────────────────────────
function useCloudSync(concerts, setConcerts) {
  const [user, setUser] = React.useState(null);
  const [status, setStatus] = React.useState(sbClient ? 'idle' : 'off');
  const [lastSync, setLastSync] = React.useState(null);
  const listRef = React.useRef(concerts);
  listRef.current = concerts;
  const pushTimer = React.useRef(null);

  React.useEffect(() => {
    if (!sbClient) return;
    sbClient.auth.getSession().then(({ data }) => setUser((data && data.session && data.session.user) || null));
    const { data: sub } = sbClient.auth.onAuthStateChange((_e, session) => setUser((session && session.user) || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const syncNow = React.useCallback(() => enqueue(async () => {
    if (!sbClient || !(await currentUser())) return;
    setStatus('sync');
    try {
      const merged = await fullSync(listRef.current);
      if (merged) setConcerts(merged);
      setLastSync(new Date());
      setStatus('ok');
    } catch (e) {
      console.error('sync fallita', e);
      setStatus('error');
    }
  }), [setConcerts]);

  // full sync al login e a ogni avvio con sessione attiva
  const uid = user && user.id;
  React.useEffect(() => { if (uid) syncNow(); }, [uid, syncNow]);

  const schedulePush = React.useCallback(() => {
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => enqueue(async () => {
      if (!(await currentUser())) return; // le modifiche restano in dirty per il prossimo login
      setStatus('sync');
      try { await pushDirty(listRef.current); setLastSync(new Date()); setStatus('ok'); }
      catch (e) { console.error('push fallito', e); setStatus('error'); }
    }), 1500);
  }, []);

  const markChanged = React.useCallback((id) => enqueue(async () => {
    const meta = await loadMeta();
    delete meta.tombstones[id];
    if (!meta.dirty.includes(id)) meta.dirty.push(id);
    await saveMeta(meta);
  }).then(schedulePush), [schedulePush]);

  const markDeleted = React.useCallback((id) => enqueue(async () => {
    const meta = await loadMeta();
    meta.tombstones[id] = new Date().toISOString();
    if (!meta.dirty.includes(id)) meta.dirty.push(id);
    await saveMeta(meta);
  }).then(schedulePush), [schedulePush]);

  return { available: !!sbClient, user, status, lastSync, syncNow, markChanged, markDeleted,
    auth: sbClient ? sbClient.auth : null };
}

// ───────────────────────── UI: foglio backup/account ─────────────────────────
function SyncSheet({ open, onClose, sync }) {
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  async function doAuth(mode) {
    if (!sync.auth || busy) return;
    const mail = email.trim().toLowerCase();
    if (!mail || pw.length < 6) { setMsg('Email e password (minimo 6 caratteri).'); return; }
    setBusy(true); setMsg('');
    try {
      if (mode === 'signup') {
        const { data, error } = await sync.auth.signUp({ email: mail, password: pw });
        if (error) throw error;
        if (!(data && data.session)) {
          // progetto con conferma email attiva: prova comunque il login diretto
          const { error: e2 } = await sync.auth.signInWithPassword({ email: mail, password: pw });
          if (e2) { setMsg('Account creato: conferma dal link ricevuto via email, poi tocca Accedi.'); return; }
        }
      } else {
        const { error } = await sync.auth.signInWithPassword({ email: mail, password: pw });
        if (error) throw error;
      }
      setMsg(''); setPw('');
    } catch (e) {
      setMsg(/invalid login/i.test(e.message || '') ? 'Email o password sbagliate.' : ('Errore: ' + (e.message || e)));
    } finally { setBusy(false); }
  }

  const statusLabel = {
    off: 'Backup non disponibile (libreria non caricata)',
    idle: 'In attesa',
    sync: 'Sincronizzazione…',
    ok: 'Sincronizzato' + (sync.lastSync ? ` · ${fmtTime(sync.lastSync.toISOString())}` : ''),
    error: 'Errore di sincronizzazione — riprova',
  }[sync.status] || '';

  return (
    <Sheet open={open} onClose={onClose} title="Backup su cloud">
      <div style={{ padding: '0 16px 16px' }}>
        {!sync.available ? (
          <p className="key-help">La libreria di sync non si è caricata (sei offline?). Riapri l'app con una connessione attiva.</p>
        ) : sync.user ? (
          <React.Fragment>
            <p className="key-help">Accesso come <b>{sync.user.email}</b></p>
            <p className="key-help" style={{ opacity: 0.75 }}>{statusLabel}</p>
            <GlassButton accent onClick={sync.syncNow} disabled={sync.status === 'sync'}
              style={{ width: '100%', height: 48, marginTop: 10 }}>
              <Icon name="cloud" size={18} /> Sincronizza ora
            </GlassButton>
            <button className="link-btn" style={{ width: '100%', marginTop: 12 }}
              onClick={async () => { await sync.auth.signOut(); }}>Esci dall'account</button>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <p className="key-help">I concerti restano salvati sul telefono e in più vengono copiati sul cloud: se cambi telefono o perdi i dati, accedi e ritrovi tutto.</p>
            <input className="inp" type="email" autoComplete="email" placeholder="email"
              value={email} onChange={e => setEmail(e.target.value)} style={{ marginTop: 10 }} />
            <input className="inp" type="password" autoComplete="current-password" placeholder="password (min 6)"
              value={pw} onChange={e => setPw(e.target.value)} style={{ marginTop: 8 }} />
            {msg && <p className="key-help" style={{ color: 'var(--accent)', marginTop: 8 }}>{msg}</p>}
            <GlassButton accent onClick={() => doAuth('login')} disabled={busy}
              style={{ width: '100%', height: 48, marginTop: 10 }}>Accedi</GlassButton>
            <button className="link-btn" style={{ width: '100%', marginTop: 10 }} disabled={busy}
              onClick={() => doAuth('signup')}>Prima volta? Crea l'account</button>
          </React.Fragment>
        )}
      </div>
    </Sheet>
  );
}

Object.assign(window, { useCloudSync, SyncSheet });
