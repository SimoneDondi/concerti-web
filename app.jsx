// app.jsx — shell: tab bar, navigazione, tema chiaro/scuro, FAB, Tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "cardStyle": "minimal",
  "accent": "#2ed3b7",
  "dark": true,
  "bgStyle": "aurora"
}/*EDITMODE-END*/;

const ACCENTS = ['#2ed3b7', '#7c5cff', '#ff5c8a', '#ff9f43', '#0a84ff'];

// sfondo "liquid": blob di colore sfocati che il vetro raccoglie
function LiquidBackground({ dark, accent, style }) {
  const blobs = style === 'mono'
    ? [accent, accent, accent]
    : [accent, 'oklch(0.65 0.18 300)', 'oklch(0.7 0.16 30)'];
  return (
    <div className="liquid-bg" style={{ background: dark ? '#07070b' : '#eef0f4' }}>
      <div className="blob" style={{ background: blobs[0], top: '-12%', left: '-15%' }} />
      <div className="blob" style={{ background: blobs[1], top: '22%', right: '-22%' }} />
      <div className="blob" style={{ background: blobs[2], bottom: '-15%', left: '8%' }} />
      <div className="bg-veil" style={{ background: dark ? 'rgba(7,7,11,0.36)' : 'rgba(238,240,244,0.32)' }} />
    </div>
  );
}

function TabBar({ tab, onTab }) {
  const items = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'stats', icon: 'chart', label: 'Statistiche' },
    { id: 'search', icon: 'search', label: 'Cerca' },
  ];
  return (
    <div className="tabbar glass">
      {items.map(it => (
        <button key={it.id} className={'tab' + (tab === it.id ? ' tab-on' : '')} onClick={() => onTab(it.id)}>
          <Icon name={it.icon} size={23} fill={false} stroke={tab === it.id ? 2.1 : 1.8} />
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [concerts, setConcerts] = React.useState(loadConcerts);
  const [tab, setTab] = React.useState('home');
  const [view, setView] = React.useState({ name: 'tabs' });
  const [confirm, setConfirm] = React.useState(null);

  React.useEffect(() => { saveConcerts(concerts); }, [concerts]);

  // scaling del mockup per riempire il viewport
  const scalerRef = React.useRef(null);
  React.useEffect(() => {
    function fit() {
      const el = scalerRef.current; if (!el) return;
      const s = Math.min((window.innerWidth - 24) / 402, (window.innerHeight - 24) / 874);
      el.style.transform = `scale(${Math.min(s, 1.15)})`;
    }
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const dark = t.dark;
  const accent = t.accent || '#2ed3b7';

  function upsert(c) {
    setConcerts(list => list.some(x => x.id === c.id) ? list.map(x => x.id === c.id ? c : x) : [c, ...list]);
  }
  function remove(id) { setConcerts(list => list.filter(x => x.id !== id)); }

  function openDetail(c) { setView({ name: 'detail', id: c.id }); }
  function openNew(draft) { setView({ name: 'form', draft: draft || null }); }
  function openEdit(c) { setView({ name: 'form', edit: c }); }

  const current = view.id ? concerts.find(c => c.id === view.id) : null;
  const allFriends = [...new Set(concerts.flatMap(c => c.friends || []))].sort();

  // variabili tema su root
  const rootVars = {
    '--accent': accent,
    '--on-accent': '#ffffff',
    '--text': dark ? 'rgba(255,255,255,0.96)' : 'rgba(18,18,22,0.96)',
    '--text-2': dark ? 'rgba(235,235,245,0.62)' : 'rgba(40,40,48,0.6)',
    '--text-3': dark ? 'rgba(235,235,245,0.38)' : 'rgba(40,40,48,0.4)',
    '--glass-bg': dark ? 'rgba(40,42,52,0.42)' : 'rgba(255,255,255,0.52)',
    '--glass-bg-strong': dark ? 'rgba(48,50,62,0.72)' : 'rgba(255,255,255,0.74)',
    '--glass-border': dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)',
    '--glass-shine': dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.9)',
    '--glass-shadow': dark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 10px 30px rgba(60,70,90,0.13)',
    '--glass-blur': '22px',
    '--hair': dark ? 'rgba(255,255,255,0.1)' : 'rgba(20,20,30,0.08)',
    '--field': dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
    '--avatar-ring': dark ? 'rgba(30,32,40,0.9)' : 'rgba(255,255,255,0.9)',
    '--accent-soft': dark ? 'color-mix(in oklab, var(--accent) 26%, transparent)' : 'color-mix(in oklab, var(--accent) 18%, transparent)',
    color: 'var(--text)',
  };

  const PHONE = !!(typeof window !== 'undefined' && window.__PHONE__);

  const appInner = (
    <div className={'app-root' + (dark ? ' dark' : ' light') + (PHONE ? ' phone' : '')} style={rootVars}>
      <LiquidBackground dark={dark} accent={accent} style={t.bgStyle} />

      <div className="app-scroll">
        {view.name === 'tabs' && (
          <React.Fragment>
            {tab === 'home' && <Home concerts={concerts} cardStyle={t.cardStyle} onOpen={openDetail} onAdd={() => openNew()} />}
            {tab === 'stats' && <Stats concerts={concerts} />}
            {tab === 'search' && <Search existingNames={concerts.map(c => c.name)} onAddFromSearch={openNew} />}
          </React.Fragment>
        )}
        {view.name === 'detail' && current && (
          <ConcertDetail c={current} onBack={() => setView({ name: 'tabs' })}
            onEdit={openEdit} onDelete={(c) => setConfirm(c)} onUpdate={upsert} />
        )}
        {view.name === 'form' && (
          <ConcertForm initial={view.edit} allFriends={allFriends}
            onCancel={() => setView(view.edit ? { name: 'detail', id: view.edit.id } : { name: 'tabs' })}
            onSave={(c) => { upsert(c); setView({ name: 'detail', id: c.id }); setTab('home'); }} />
        )}
      </div>

      {/* azioni in alto a destra: aggiungi + tema */}
      {view.name === 'tabs' && (
        <React.Fragment>
          <button className="theme-btn round-btn" style={{ right: 62 }} onClick={() => openNew()}>
            <Icon name="plus" size={22} stroke={2.4} />
          </button>
          <button className="theme-btn round-btn" onClick={() => setTweak('dark', !dark)}>
            <Icon name={dark ? 'sun' : 'moon'} size={20} />
          </button>
        </React.Fragment>
      )}

      {/* tab bar */}
      {view.name === 'tabs' && (
        <TabBar tab={tab} onTab={(id) => { setTab(id); setView({ name: 'tabs' }); }} />
      )}

      {/* conferma eliminazione */}
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Eliminare il concerto?">
        <div style={{ padding: '0 16px 12px' }}>
          {confirm && <p className="key-help">«{confirm.name}» verrà rimosso definitivamente.</p>}
          <GlassButton onClick={() => { remove(confirm.id); setConfirm(null); setView({ name: 'tabs' }); }}
            style={{ width: '100%', height: 48, color: '#ff5c5c', marginBottom: 10 }}>
            <Icon name="trash" size={18} /> Elimina
          </GlassButton>
          <button className="link-btn" style={{ width: '100%' }} onClick={() => setConfirm(null)}>Annulla</button>
        </div>
      </Sheet>
    </div>
  );

  return (
    <React.Fragment>
    {PHONE ? appInner : (
      <div className="stage">
        <div className="scaler" ref={scalerRef}>
          <IOSDevice dark={dark}>{appInner}</IOSDevice>
        </div>
      </div>
    )}

      {/* pannello Tweaks (fuori dallo scaler per non essere tagliato) */}
      <TweaksPanel>
        <TweakSection label="Stile card (Home)" />
        <TweakRadio label="Layout" value={t.cardStyle} options={[
          { value: 'feature', label: 'Poster' }, { value: 'list', label: 'Lista' }, { value: 'minimal', label: 'Minimal' }]}
          onChange={v => setTweak('cardStyle', v)} />
        <TweakSection label="Tema" />
        <TweakToggle label="Modalità scura" value={t.dark} onChange={v => setTweak('dark', v)} />
        <TweakColor label="Accento" value={t.accent} options={ACCENTS} onChange={v => setTweak('accent', v)} />
        <TweakRadio label="Sfondo" value={t.bgStyle} options={[
          { value: 'aurora', label: 'Aurora' }, { value: 'mono', label: 'Mono' }]}
          onChange={v => setTweak('bgStyle', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

Object.assign(window, { App });
