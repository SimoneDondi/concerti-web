// detail.jsx — dettaglio concerto + form aggiungi/modifica

function InfoRow({ icon, label, value, onClick, trailing, accentIcon }) {
  return (
    <div className={'info-row' + (onClick ? ' pressable' : '')} onClick={onClick}>
      <div className={'info-ico' + (accentIcon ? ' info-ico-accent' : '')}><Icon name={icon} size={20} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="info-label">{label}</div>
        <div className="info-value">{value}</div>
      </div>
      {trailing}
    </div>
  );
}

function ConcertDetail({ c, onBack, onEdit, onDelete, onUpdate }) {
  const [mapsOpen, setMapsOpen] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteVal, setNoteVal] = React.useState(c.note || '');
  const [toast, setToast] = React.useState('');
  const fileRef = React.useRef(null);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1900); };
  function openNote() { setNoteVal(c.note || ''); setNoteOpen(true); }
  function saveNote() { onUpdate({ ...c, note: noteVal.trim() }); setNoteOpen(false); flash('Nota salvata'); }

  function onPickPdf(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { flash('Serve un file PDF'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      onUpdate({ ...c, ticketPdf: { name: f.name, dataUrl: reader.result } });
      flash('Biglietto caricato');
    };
    reader.readAsDataURL(f);
  }
  function viewPdf() {
    try {
      const [meta, b64] = c.ticketPdf.dataUrl.split(',');
      const bin = atob(b64); const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (e) { window.open(c.ticketPdf.dataUrl, '_blank'); }
  }
  function addCal() { openCalendar(c); flash('Apertura del calendario…'); }

  return (
    <div className="screen detail-screen">
      {/* header poster */}
      <div className="detail-hero">
        <PosterArt concert={c} radius={0} big style={{ position: 'absolute', inset: 0 }} />
        <div className="detail-hero-grad" />
        <div className="detail-topbar">
          <button className="round-btn" onClick={onBack}><Icon name="chevL" size={22} /></button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="round-btn" onClick={() => onEdit(c)}><Icon name="edit" size={20} /></button>
            <button className="round-btn" onClick={() => onDelete(c)}><Icon name="trash" size={19} /></button>
          </div>
        </div>
        <div className="detail-hero-text">
          {isUpcoming(c.date) && <div className="hero-badge"><Countdown iso={c.date} /></div>}
          <div className="genre-tag">{c.genre}</div>
          <h1 className="detail-title">{c.name}</h1>
        </div>
      </div>

      <div className="detail-body">
        <Glass className="info-card" r={24}>
          <InfoRow icon="calendar" label="Data e ora"
            value={`${fmtDateLong(c.date)} · ${fmtTime(c.date)}`}
            trailing={<button className="link-btn" onClick={addCal}><Icon name="calendarPlus" size={18} /> Calendario</button>} />
          <div className="info-sep" />
          <InfoRow icon="pin" label="Luogo"
            value={<span>{c.venue}<br /><span style={{ opacity: 0.7 }}>{c.address}</span></span>}
            onClick={() => setMapsOpen(true)}
            trailing={<span className="open-maps"><Icon name="external" size={17} /></span>} />
          <div className="info-sep" />
          <InfoRow icon="euro" label="Spesa" value={fmtEuro2(c.cost)} />
        </Glass>

        {/* amici */}
        <div className="block-label"><Icon name="users" size={16} /> Con chi vai{c.friends && c.friends.length ? ` · ${c.friends.length}` : ''}</div>
        <Glass className="friends-card" r={22}>
          {c.friends && c.friends.length ? (
            <div className="friend-rows">
              {c.friends.map(f => (
                <div className="friend-chip" key={f}><Avatar name={f} size={30} ring={false} /><span>{f}</span></div>
              ))}
            </div>
          ) : <div className="muted-line">Nessun amico aggiunto</div>}
        </Glass>

        {/* note */}
        <div className="block-label"><Icon name="edit" size={16} /> Note</div>
        {c.note ? (
          <Glass className="note-card pressable" r={22} onClick={openNote}>
            <div className="note-text">{c.note}</div>
            <span className="note-edit"><Icon name="edit" size={16} /></span>
          </Glass>
        ) : (
          <Glass className="upload-card pressable" r={22} onClick={openNote}>
            <Icon name="edit" size={22} />
            <div>
              <div className="info-value" style={{ fontWeight: 600 }}>Aggiungi una nota</div>
              <div className="info-label">Setlist, ricordi, dove eravate seduti…</div>
            </div>
          </Glass>
        )}

        {/* biglietto */}
        <div className="block-label"><Icon name="ticket" size={16} /> Biglietto</div>
        <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={onPickPdf} />
        {c.ticketPdf ? (
          <Glass className="ticket-card pressable" r={22} onClick={viewPdf}>
            <div className="info-ico info-ico-accent"><Icon name="pdf" size={22} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="info-value" style={{ fontWeight: 600 }}>{c.ticketPdf.name}</div>
              <div className="info-label">Tocca per aprire · PDF</div>
            </div>
            <button className="link-btn" onClick={(e) => { e.stopPropagation(); fileRef.current.click(); }}>Sostituisci</button>
          </Glass>
        ) : (
          <Glass className="upload-card pressable" r={22} onClick={() => fileRef.current.click()}>
            <Icon name="upload" size={24} />
            <div>
              <div className="info-value" style={{ fontWeight: 600 }}>Carica biglietto PDF</div>
              <div className="info-label">Lo tieni sempre a portata di mano</div>
            </div>
          </Glass>
        )}

        {/* azione principale calendario */}
        <GlassButton accent onClick={addCal} style={{ width: '100%', marginTop: 18, height: 52, fontSize: 16 }}>
          <Icon name="calendarPlus" size={20} /> Aggiungi al calendario
        </GlassButton>

        <div style={{ height: 130 }} />
      </div>

      <Sheet open={mapsOpen} onClose={() => setMapsOpen(false)} title="Apri indirizzo">
        <div style={{ padding: '4px 16px 8px' }}>
          <div className="maps-addr">{c.venue}<br /><span style={{ opacity: 0.65 }}>{c.address}</span></div>
          <a className="maps-opt" href={gmapsUrl(c.venue + ', ' + c.address)} target="_blank" rel="noreferrer">
            <span className="maps-dot" style={{ background: 'oklch(0.62 0.17 150deg)' }} />Google Maps<Icon name="chevR" size={18} style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </a>
          <a className="maps-opt" href={appleMapsUrl(c.venue + ', ' + c.address)} target="_blank" rel="noreferrer">
            <span className="maps-dot" style={{ background: 'oklch(0.62 0.05 250deg)' }} />Apple Mappe<Icon name="chevR" size={18} style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </a>
        </div>
      </Sheet>

      <Sheet open={noteOpen} onClose={() => setNoteOpen(false)} title="Note">
        <div style={{ padding: '0 16px 12px' }}>
          <textarea className="inp note-textarea" value={noteVal} onChange={e => setNoteVal(e.target.value)}
            placeholder="Scrivi qui: la setlist, com'è andata, con chi eri, il posto migliore…" autoFocus />
          <GlassButton accent onClick={saveNote} style={{ width: '100%', height: 48, marginTop: 12 }}>
            <Icon name="check" size={18} /> Salva nota
          </GlassButton>
          {c.note && <button className="link-btn" style={{ marginTop: 10 }} onClick={() => { onUpdate({ ...c, note: '' }); setNoteOpen(false); flash('Nota rimossa'); }}>Elimina nota</button>}
        </div>
      </Sheet>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ───────────────────────── Form aggiungi / modifica ─────────────────────────
const GENRE_HUE = { 'Pop': 330, 'Pop rock': 265, 'Rock': 10, 'Indie pop': 20, 'Psych rock': 160, 'Elettronica': 290, 'Hip hop': 45, 'Indie': 200, 'Metal': 0, 'Jazz': 60, 'Altro': 250 };

function Field({ label, children }) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function ConcertForm({ initial, allFriends, onCancel, onSave }) {
  const isEdit = !!initial;
  const init = initial || {};
  const [name, setName] = React.useState(init.name || '');
  const d = init.date ? parseDate(init.date) : null;
  const [date, setDate] = React.useState(d ? d.toISOString().slice(0, 10) : '');
  const [time, setTime] = React.useState(d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '21:00');
  const [cost, setCost] = React.useState(init.cost != null ? String(init.cost) : '');
  const [venue, setVenue] = React.useState(init.venue || '');
  const [city, setCity] = React.useState(init.city || '');
  const [address, setAddress] = React.useState(init.address || '');
  const [genre, setGenre] = React.useState(init.genre || 'Pop');
  const [friends, setFriends] = React.useState(init.friends || []);
  const [fInput, setFInput] = React.useState('');
  const [note, setNote] = React.useState(init.note || '');

  function addFriend(n) {
    const v = (n || fInput).trim();
    if (v && !friends.includes(v)) setFriends([...friends, v]);
    setFInput('');
  }
  const fq = fInput.trim().toLowerCase();
  const suggestions = (allFriends || [])
    .filter(f => !friends.includes(f))
    .filter(f => !fq || f.toLowerCase().includes(fq))
    .slice(0, fq ? 8 : 6);
  const valid = name.trim() && date && venue.trim() && city.trim();

  function save() {
    if (!valid) return;
    const concert = {
      id: init.id || newId(),
      name: name.trim(), date: `${date}T${time}`, cost: Number(cost) || 0,
      venue: venue.trim(), city: city.trim(), address: address.trim() || `${venue.trim()}, ${city.trim()}`,
      friends, genre, hue: GENRE_HUE[genre] ?? 250, ticketPdf: init.ticketPdf || null, note: note.trim(),
    };
    onSave(concert);
  }

  return (
    <div className="screen form-screen">
      <div className="form-topbar glass">
        <button className="link-btn" onClick={onCancel}>Annulla</button>
        <div className="form-heading">{isEdit ? 'Modifica' : 'Nuovo concerto'}</div>
        <button className={'link-btn strong' + (valid ? '' : ' disabled')} onClick={save}>Salva</button>
      </div>

      <div className="form-body">
        <Field label="Artista / Evento">
          <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="es. Dua Lipa" />
        </Field>
        <div className="form-row">
          <Field label="Data"><input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="Ora"><input className="inp" type="time" value={time} onChange={e => setTime(e.target.value)} /></Field>
        </div>
        <div className="form-row">
          <Field label="Spesa (€)"><input className="inp" type="number" inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)} placeholder="0" /></Field>
          <Field label="Genere">
            <div className="select-wrap">
              <select className="inp" value={genre} onChange={e => setGenre(e.target.value)}>
                {Object.keys(GENRE_HUE).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <Icon name="chevDown" size={16} style={{ position: 'absolute', right: 12, top: 15, pointerEvents: 'none', opacity: 0.5 }} />
            </div>
          </Field>
        </div>
        <Field label="Venue"><input className="inp" value={venue} onChange={e => setVenue(e.target.value)} placeholder="es. Stadio San Siro" /></Field>
        <div className="form-row">
          <Field label="Città"><input className="inp" value={city} onChange={e => setCity(e.target.value)} placeholder="es. Milano" /></Field>
          <Field label="Indirizzo"><input className="inp" value={address} onChange={e => setAddress(e.target.value)} placeholder="via, n°" /></Field>
        </div>

        <Field label="Amici">
          <div className="chip-input">
            {friends.map(f => (
              <span className="edit-chip" key={f}>{f}<button onClick={() => setFriends(friends.filter(x => x !== f))}><Icon name="x" size={13} /></button></span>
            ))}
            <input className="chip-text" value={fInput} onChange={e => setFInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFriend(); } }}
              placeholder={friends.length ? 'aggiungi…' : 'aggiungi un amico'} />
          </div>
          {suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map(s => <button key={s} className="sugg" onClick={() => addFriend(s)}>+ {s}</button>)}
            </div>
          )}
        </Field>

        <Field label="Note">
          <textarea className="inp note-textarea" value={note} onChange={e => setNote(e.target.value)}
            placeholder="Setlist, ricordi, posti… (facoltativo)" />
        </Field>

        <div style={{ height: 140 }} />
      </div>
    </div>
  );
}

function pad2(n) { return String(n).padStart(2, '0'); }

Object.assign(window, { ConcertDetail, ConcertForm, InfoRow });
