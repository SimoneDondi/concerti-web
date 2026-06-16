// home.jsx — schermata Home con lista concerti e 3 varianti di card

function Countdown({ iso }) {
  const d = daysUntil(iso);
  if (d < 0) return null;
  const label = d === 0 ? 'Oggi' : d === 1 ? 'Domani' : `tra ${d} giorni`;
  return <span className="countdown">{label}</span>;
}

function FriendStack({ friends, max = 3 }) {
  const shown = friends.slice(0, max);
  const extra = friends.length - shown.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex' }}>
        {shown.map((f, i) => (
          <div key={f} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: shown.length - i }}>
            <Avatar name={f} size={26} />
          </div>
        ))}
      </div>
      {extra > 0 && <span className="friend-extra">+{extra}</span>}
    </div>
  );
}

// ── Variante FEATURE: poster grande in alto ──
function CardFeature({ c, onOpen }) {
  return (
    <Glass className="card-feature pressable" r={26} onClick={() => onOpen(c)}>
      <div style={{ position: 'relative' }}>
        <PosterArt concert={c} radius={0} big style={{ height: 168, width: '100%' }} />
        <div className="date-chip">
          <span className="date-chip-day">{fmtDayNum(c.date)}</span>
          <span className="date-chip-mon">{fmtMonthAbbr(c.date)}</span>
        </div>
        {isUpcoming(c.date) && <div className="feature-countdown"><Countdown iso={c.date} /></div>}
      </div>
      <div style={{ padding: '13px 16px 15px' }}>
        <div className="card-name" style={{ fontSize: 21 }}>{c.name}</div>
        <div className="card-sub" style={{ marginTop: 3 }}>
          {c.venue} · {c.city}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 }}>
          <FriendStack friends={c.friends || []} />
          <span className="cost-pill">{fmtEuro(c.cost)}</span>
        </div>
      </div>
    </Glass>
  );
}

// ── Variante LIST: poster quadrato a sinistra ──
function CardList({ c, onOpen }) {
  return (
    <Glass className="card-list pressable" r={22} onClick={() => onOpen(c)}>
      <PosterArt concert={c} radius={16} style={{ width: 64, height: 64 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div className="card-name" style={{ fontSize: 17 }}>{c.name}</div>
          <span className="cost-pill sm">{fmtEuro(c.cost)}</span>
        </div>
        <div className="card-sub" style={{ marginTop: 2 }}>{c.venue} · {c.city}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
          <span className="card-meta">{fmtDate(c.date)} · {fmtTime(c.date)}</span>
          <FriendStack friends={c.friends || []} max={4} />
        </div>
      </div>
    </Glass>
  );
}

// ── Variante MINIMAL: blocco data tipografico, niente poster ──
function CardMinimal({ c, onOpen }) {
  return (
    <Glass className="card-minimal pressable" r={22} onClick={() => onOpen(c)}>
      <div className="date-block">
        <span className="date-block-day">{fmtDayNum(c.date)}</span>
        <span className="date-block-mon">{fmtMonthAbbr(c.date)}</span>
      </div>
      <div className="date-divider" style={{ background: `oklch(0.62 0.17 ${c.hue}deg)` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="card-name" style={{ fontSize: 17 }}>{c.name}</div>
        <div className="card-sub" style={{ marginTop: 2 }}>{c.venue} · {c.city}</div>
        <div style={{ marginTop: 10 }}><FriendStack friends={c.friends || []} max={4} /></div>
      </div>
      <div className="minimal-right">
        <span className="cost-pill sm">{fmtEuro(c.cost)}</span>
        {isUpcoming(c.date) ? <Countdown iso={c.date} /> : <span className="card-meta">{fmtTime(c.date)}</span>}
      </div>
    </Glass>
  );
}

function ConcertCard({ c, variant, onOpen }) {
  if (variant === 'list') return <CardList c={c} onOpen={onOpen} />;
  if (variant === 'minimal') return <CardMinimal c={c} onOpen={onOpen} />;
  return <CardFeature c={c} onOpen={onOpen} />;
}

function Home({ concerts, cardStyle, onOpen, onAdd }) {
  const [filter, setFilter] = React.useState('tutti');

  // Futuri: dal più vicino. Passati: dal più recente al più vecchio.
  const currentYear = NOW.getFullYear();
  const upcoming = [...concerts].filter(c => isUpcoming(c.date)).sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const pastAll = [...concerts].filter(c => !isUpcoming(c.date)).sort((a, b) => parseDate(b.date) - parseDate(a.date));
  // Nella vista "Tutti" mostriamo solo i passati dell'anno in corso; il filtro "Passati" mostra tutti gli anni.
  const pastYear = pastAll.filter(c => parseDate(c.date).getFullYear() === currentYear);

  const card = (c) => <ConcertCard key={c.id} c={c} variant={cardStyle} onOpen={onOpen} />;
  const sectionLabel = (text) => (
    <div key={'lbl-' + text} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: 0.2, padding: '6px 4px 11px' }}>{text}</div>
  );
  const empty = (
    <div className="empty"><Icon name="music" size={30} /><div style={{ marginTop: 8 }}>Nessun concerto qui</div></div>
  );

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="screen-kicker">{concerts.length} concerti · {fmtEuro(sumCost(concerts))} totali</div>
          <h1 className="screen-title">Concerti</h1>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <Segmented
          options={[{ value: 'tutti', label: 'Tutti' }, { value: 'arrivo', label: 'In arrivo' }, { value: 'passati', label: 'Passati' }]}
          value={filter} onChange={setFilter} />
      </div>

      <div className="card-stack" style={{ paddingTop: 18 }}>
        {filter === 'arrivo' && (upcoming.length ? upcoming.map(card) : empty)}
        {filter === 'passati' && (pastAll.length ? pastAll.map(card) : empty)}
        {filter === 'tutti' && (
          upcoming.length === 0 && pastYear.length === 0 ? empty : (
            <React.Fragment>
              {upcoming.length > 0 && sectionLabel('In arrivo')}
              {upcoming.map(card)}
              {pastYear.length > 0 && sectionLabel('Passati')}
              {pastYear.map(card)}
            </React.Fragment>
          )
        )}
      </div>
      <div style={{ height: 120 }} />
    </div>
  );
}

Object.assign(window, { Home, ConcertCard, FriendStack, Countdown });
