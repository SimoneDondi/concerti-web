// search.jsx — ricerca eventi su Ticketmaster (API reale con chiave, fallback realistico)

const hueFromName = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const buyUrl = (ev) => (ev.url && /ticketmaster\.it/i.test(ev.url)) ? ev.url : `https://www.ticketmaster.it/search?q=${encodeURIComponent(ev.name)}`;

// ── Dati di esempio usati finché non c'è la chiave API ──
const MOCK_EVENTS = [
  { name:'Olivia Rodrigo', date:'2026-09-14T20:30', cost:79, venue:'Unipol Forum', city:'Assago', address:'Via G. di Vittorio 6', genre:'Pop' },
  { name:'The Weeknd', date:'2026-08-02T21:00', cost:110, venue:'Stadio San Siro', city:'Milano', address:'Piazzale Angelo Moratti', genre:'R&B' },
  { name:'Fred again..', date:'2026-10-05T22:00', cost:55, venue:'Fabrique', city:'Milano', address:'Via Fantoli 9', genre:'Elettronica' },
  { name:'Billie Eilish', date:'2026-07-28T20:45', cost:95, venue:'Ippodromo Snai La Maura', city:'Milano', address:'Via Lampugnano 95', genre:'Pop' },
  { name:'Travis Scott', date:'2026-09-01T21:00', cost:99, venue:'Stadio Olimpico', city:'Roma', address:'Viale dei Gladiatori', genre:'Hip hop' },
  { name:'Pulp', date:'2026-06-30T21:00', cost:68, venue:'Ippodromo delle Capannelle', city:'Roma', address:'Via Appia Nuova 1245', genre:'Rock' },
  { name:'Tyler, The Creator', date:'2026-11-12T21:00', cost:72, venue:'Mediolanum Forum', city:'Assago', address:'Via G. di Vittorio 6', genre:'Hip hop' },
  { name:'Massive Attack', date:'2026-07-19T21:30', cost:60, venue:'Sequoie Music Park', city:'Bologna', address:'Caserma Mazzoni', genre:'Trip hop' },
  { name:'Charli XCX', date:'2026-10-22T21:00', cost:58, venue:'Alcatraz', city:'Milano', address:'Via Valtellina 25', genre:'Pop' },
  { name:'Sabrina Carpenter', date:'2026-09-25T20:30', cost:85, venue:'Unipol Arena', city:'Bologna', address:'Via Gino Cervi 2', genre:'Pop' },
  { name:'Disclosure', date:'2026-08-16T22:30', cost:50, venue:'Carroponte', city:'Sesto San Giovanni', address:'Via Granelli 1', genre:'Elettronica' },
  { name:'Vasco Rossi', date:'2026-06-22T21:00', cost:90, venue:'Stadio Euganeo', city:'Padova', address:'Via Nereo Rocco', genre:'Rock' },
];

function mapTicketmaster(ev) {
  const v = (ev._embedded && ev._embedded.venues && ev._embedded.venues[0]) || {};
  const start = (ev.dates && ev.dates.start) || {};
  const date = start.localDate ? `${start.localDate}T${(start.localTime || '21:00:00').slice(0, 5)}` : '';
  const cls = (ev.classifications && ev.classifications[0]) || {};
  const genre = (cls.genre && cls.genre.name && cls.genre.name !== 'Undefined' ? cls.genre.name
    : (cls.segment && cls.segment.name) || 'Altro');
  const pr = (ev.priceRanges && ev.priceRanges[0]) || null;
  const img = (ev.images || []).filter(i => i.ratio === '16_9').sort((a, b) => b.width - a.width)[0]
    || (ev.images || [])[0];
  return {
    name: ev.name, date,
    cost: pr ? Math.round(pr.min) : 0,
    venue: v.name || '', city: (v.city && v.city.name) || '',
    address: (v.address && v.address.line1) ? `${v.address.line1}${v.city ? ', ' + v.city.name : ''}` : (v.city && v.city.name) || '',
    genre, image: img ? img.url : null, url: ev.url || null,
  };
}

function ResultCard({ ev, added, onAdd }) {
  const hue = hueFromName(ev.name);
  return (
    <Glass className="result-card" r={20}>
      {ev.image
        ? <div className="result-img" style={{ backgroundImage: `url(${ev.image})` }} />
        : <PosterArt concert={{ name: ev.name, hue }} radius={14} style={{ width: 58, height: 58 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="card-name" style={{ fontSize: 16 }}>{ev.name}</div>
        <div className="card-sub" style={{ marginTop: 2 }}>{ev.venue || '—'}{ev.city ? ' · ' + ev.city : ''}</div>
        <div className="card-meta" style={{ marginTop: 5 }}>
          {ev.date ? `${fmtDate(ev.date)} · ${fmtTime(ev.date)}` : 'Data da definire'}{ev.cost ? ' · da ' + fmtEuro(ev.cost) : ''}
        </div>
      </div>
      <div className="result-actions">
        <a className="buy-pill" href={buyUrl(ev)} target="_blank" rel="noreferrer">Biglietti <Icon name="external" size={14} /></a>
        <button className={'add-mini' + (added ? ' added' : '')} onClick={() => onAdd(ev)} disabled={added}>
          <Icon name={added ? 'check' : 'plus'} size={15} /> {added ? 'In lista' : 'Aggiungi'}
        </button>
      </div>
    </Glass>
  );
}

function Search({ existingNames, onAddFromSearch }) {
  const [q, setQ] = React.useState('');
  const [results, setResults] = React.useState(MOCK_EVENTS.slice(0, 6));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [usingMock, setUsingMock] = React.useState(!getApiKey());
  const [keyOpen, setKeyOpen] = React.useState(false);
  const [keyVal, setKeyVal] = React.useState(getApiKey());
  const [added, setAdded] = React.useState({});
  const tRef = React.useRef(null);

  function runMock(query) {
    const ql = query.trim().toLowerCase();
    const r = !ql ? MOCK_EVENTS.slice(0, 6)
      : MOCK_EVENTS.filter(e => e.name.toLowerCase().includes(ql) || e.city.toLowerCase().includes(ql) || e.genre.toLowerCase().includes(ql));
    setResults(r); setLoading(false); setUsingMock(true); setError('');
  }

  async function runApi(query) {
    const key = getApiKey();
    if (!key) { runMock(query); return; }
    setLoading(true); setError(''); setUsingMock(false);
    try {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?classificationName=music&countryCode=IT&size=24&sort=date,asc&keyword=${encodeURIComponent(query)}&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const evs = (data._embedded && data._embedded.events) || [];
      setResults(evs.map(mapTicketmaster));
      if (!evs.length) setError('Nessun evento trovato su Ticketmaster.');
    } catch (e) {
      setError('Connessione a Ticketmaster non riuscita — mostro risultati di esempio.');
      runMock(query);
    } finally { setLoading(false); }
  }

  function onChange(val) {
    setQ(val);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => { getApiKey() ? runApi(val) : runMock(val); }, 350);
  }
  function saveKey() {
    setApiKey(keyVal.trim()); setKeyOpen(false);
    if (keyVal.trim()) runApi(q); else runMock(q);
  }
  function add(ev) {
    setAdded(a => ({ ...a, [ev.name + ev.date]: true }));
    onAddFromSearch({ ...ev, hue: hueFromName(ev.name) });
  }

  const hasKey = !!getApiKey();

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="screen-kicker">Powered by Ticketmaster</div>
          <h1 className="screen-title">Cerca</h1>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div className="search-bar glass">
          <Icon name="search" size={20} style={{ opacity: 0.55 }} />
          <input className="search-input" value={q} onChange={e => onChange(e.target.value)}
            placeholder="Artista, città o genere…" />
          {q && <button className="clear-x" onClick={() => onChange('')}><Icon name="x" size={16} /></button>}
        </div>

        <div className="api-status" onClick={() => { setKeyVal(getApiKey()); setKeyOpen(true); }}>
          <span className={'api-dot' + (hasKey ? ' on' : '')} />
          {hasKey ? 'Chiave API attiva' : 'Risultati di esempio · tocca per inserire la chiave API'}
          <Icon name="key" size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </div>
      </div>

      <div className="card-stack" style={{ paddingTop: 14 }}>
        {loading && <div className="loading"><div className="spinner" /> Ricerca su Ticketmaster…</div>}
        {error && <div className="search-note">{error}</div>}
        {!loading && results.map((ev, i) => (
          <ResultCard key={ev.name + i} ev={ev} added={!!added[ev.name + ev.date] || existingNames.includes(ev.name)} onAdd={add} />
        ))}
        {!loading && !results.length && <div className="empty"><Icon name="search" size={28} /><div style={{ marginTop: 8 }}>Nessun risultato</div></div>}
      </div>
      <div style={{ height: 120 }} />

      <Sheet open={keyOpen} onClose={() => setKeyOpen(false)} title="Chiave API Ticketmaster">
        <div style={{ padding: '4px 16px 10px' }}>
          <p className="key-help">Incolla la tua <b>Consumer Key</b> dal portale developer di Ticketmaster. Viene salvata solo su questo dispositivo.</p>
          <input className="inp" value={keyVal} onChange={e => setKeyVal(e.target.value)} placeholder="es. AbCd1234…" style={{ marginBottom: 12 }} />
          <GlassButton accent onClick={saveKey} style={{ width: '100%', height: 48 }}>Salva chiave</GlassButton>
          {getApiKey() && <button className="link-btn" style={{ marginTop: 12 }} onClick={() => { setApiKey(''); setKeyVal(''); setUsingMock(true); runMock(q); setKeyOpen(false); }}>Rimuovi chiave</button>}
        </div>
      </Sheet>
    </div>
  );
}

Object.assign(window, { Search });
