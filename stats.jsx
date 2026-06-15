// stats.jsx — statistiche: spesa annua/mensile, concerti annua/mensile, top città, top amici

function StatTile({ label, value, sub, icon, big }) {
  return (
    <Glass className="stat-tile" r={22}>
      <div className="stat-ico"><Icon name={icon} size={18} /></div>
      <div className="stat-value" style={{ fontSize: big ? 30 : 26 }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </Glass>
  );
}

function Bars({ data, labels, highlight }) {
  const max = Math.max(1, ...data);
  return (
    <div className="bars">
      {data.map((v, i) => (
        <div className="bar-col" key={i}>
          <div className="bar-track">
            <div className={'bar-fill' + (i === highlight ? ' bar-hot' : '')}
              style={{ height: `${Math.max(v > 0 ? 6 : 0, (v / max) * 100)}%` }}>
              {v > 0 && <span className="bar-val">{Math.round(v)}</span>}
            </div>
          </div>
          <span className={'bar-lbl' + (i === highlight ? ' bar-lbl-hot' : '')}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function RankRow({ rank, title, sub, count, max, avatar, unit }) {
  const medal = ['#ffd25e', '#cfd4dc', '#e0a071'][rank] || null;
  return (
    <div className="rank-row">
      <div className="rank-num" style={medal ? { background: medal, color: '#3a2e12' } : {}}>{rank + 1}</div>
      {avatar ? <Avatar name={title} size={36} ring={false} /> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="rank-title">{title}</div>
        <div className="rank-bar-track"><div className="rank-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
      </div>
      <div className="rank-count">{count}<span className="rank-unit">{unit}</span></div>
    </div>
  );
}

function Stats({ concerts }) {
  const years = yearsPresent(concerts);
  const [scope, setScope] = React.useState(years.includes(2026) ? '2026' : (years[0] ? String(years[0]) : 'all'));

  const isAll = scope === 'all';
  const year = isAll ? null : Number(scope);
  const inScope = isAll ? concerts : byYear(concerts, year);

  const curMonth = NOW.getMonth(); // giugno = 5
  const monthList = isAll ? concerts.filter(c => parseDate(c.date).getMonth() === curMonth)
    : byMonth(concerts, year, curMonth);

  const cities = topCities(inScope, 3);
  const friends = topFriends(inScope, 5);
  const maxCity = Math.max(1, ...cities.map(c => c.count));
  const maxFriend = Math.max(1, ...friends.map(f => f.count));

  // grafico: mensile per anno, oppure per anno se "Sempre"
  let chartData, chartLabels, chartHi;
  if (isAll) {
    const ys = [...years].sort((a, b) => a - b);
    chartData = ys.map(y => sumCost(byYear(concerts, y)));
    chartLabels = ys.map(y => String(y).slice(2));
    chartHi = -1;
  } else {
    chartData = monthlySpend(concerts, year);
    chartLabels = MESI_ABBR.map(m => m[0].toUpperCase() + m[1]);
    chartHi = year === 2026 ? curMonth : -1;
  }

  const monthLabel = MESI[curMonth][0].toUpperCase() + MESI[curMonth].slice(1);

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="screen-kicker">Il tuo anno in musica</div>
          <h1 className="screen-title">Statistiche</h1>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <Segmented
          options={[...years.map(y => ({ value: String(y), label: String(y) })), { value: 'all', label: 'Sempre' }]}
          value={scope} onChange={setScope} />
      </div>

      <div className="stats-grid">
        <StatTile icon="euro" big label={isAll ? 'Spesa totale' : `Spesa ${year}`} value={fmtEuro(sumCost(inScope))}
          sub={`${monthLabel}: ${fmtEuro(sumCost(monthList))}`} />
        <StatTile icon="music" big label={isAll ? 'Concerti totali' : `Concerti ${year}`} value={inScope.length}
          sub={`${monthLabel}: ${monthList.length}`} />
      </div>

      <div className="block-label" style={{ marginTop: 22 }}><Icon name="chart" size={16} /> {isAll ? 'Spesa per anno' : 'Spesa mensile'}</div>
      <Glass className="chart-card" r={24}><Bars data={chartData} labels={chartLabels} highlight={chartHi} /></Glass>

      <div className="block-label"><Icon name="pin" size={16} /> Top 3 città</div>
      <Glass className="rank-card" r={22}>
        {cities.length ? cities.map((c, i) => (
          <RankRow key={c.city} rank={i} title={c.city} count={c.count} max={maxCity} unit={c.count === 1 ? ' concerto' : ' concerti'} />
        )) : <div className="muted-line">Ancora nessun dato</div>}
      </Glass>

      <div className="block-label"><Icon name="users" size={16} /> Top 5 amici</div>
      <Glass className="rank-card" r={22}>
        {friends.length ? friends.map((f, i) => (
          <RankRow key={f.name} rank={i} title={f.name} count={f.count} max={maxFriend} avatar unit={f.count === 1 ? ' volta' : ' volte'} />
        )) : <div className="muted-line">Ancora nessun dato</div>}
      </Glass>

      <div style={{ height: 120 }} />
    </div>
  );
}

Object.assign(window, { Stats });
