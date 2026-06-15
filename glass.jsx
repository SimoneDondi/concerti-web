// glass.jsx — primitive Liquid Glass + icone (stroke = currentColor)

// ───────────────────────── Icone ─────────────────────────
function Icon({ name, size = 24, stroke = 1.8, style = {}, fill = false }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', style };
  const P = {
    home: <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />,
    chart: <g><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></g>,
    search: <g><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></g>,
    plus: <path d="M12 5v14M5 12h14" />,
    calendar: <g><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></g>,
    calendarPlus: <g><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M3.5 9.5h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></g>,
    pin: <g><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></g>,
    ticket: <g><path d="M3 8.5A2 2 0 0 1 5 6.5h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /><path d="M14 6.5v11" strokeDasharray="1.5 2.4" /></g>,
    euro: <g><path d="M16.5 6.5A6 6 0 0 0 7 11m9.5 6.5A6 6 0 0 1 7 13M4 10h7M4 13.5h6" /></g>,
    users: <g><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 6M17.5 19.5a5.5 5.5 0 0 0-2.4-4.5" /></g>,
    clock: <g><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></g>,
    chevR: <path d="m9 5 7 7-7 7" />,
    chevL: <path d="m15 5-7 7 7 7" />,
    chevDown: <path d="m5 9 7 7 7-7" />,
    share: <g><path d="M12 15V3M8 7l4-4 4 4" /><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /></g>,
    x: <path d="M6 6l12 12M18 6 6 18" />,
    check: <path d="M5 12.5 10 17l9-10" />,
    trophy: <g><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9.5 14.5 9 19h6l-.5-4.5M7 21h10" /></g>,
    music: <g><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></g>,
    sun: <g><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" /></g>,
    moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />,
    trash: <g><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" /></g>,
    edit: <g><path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3Z" /><path d="M14.5 7.5 17 10" /></g>,
    pdf: <g><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4" /><path d="M8.5 13.5h1.2a1.2 1.2 0 0 1 0 2.4H8.5V12m4 0v4.5m0-4.5h1.8m-1.8 2.2h1.4" strokeWidth="1.4" /></g>,
    upload: <g><path d="M12 16V4m-4 4 4-4 4 4" /><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></g>,
    external: <g><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></g>,
    sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />,
    filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
    key: <g><circle cx="8" cy="8" r="4" /><path d="M11 11l9 9M16 16l2-2M19 19l2-2" /></g>,
  };
  return <svg {...common} fill={fill ? 'currentColor' : 'none'}>{P[name] || null}</svg>;
}

// ───────────────────────── Superfici vetro ─────────────────────────
// className "glass" definita nello <style> globale; qui solo wrapper comodi.
function Glass({ children, className = '', style = {}, onClick, r = 28, ...rest }) {
  return (
    <div onClick={onClick} className={`glass ${className}`} style={{ borderRadius: r, ...style }} {...rest}>
      {children}
    </div>
  );
}

// pulsante pillola vetro
function GlassButton({ children, onClick, accent = false, style = {}, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={accent ? 'btn-accent' : 'btn-glass'}
      style={{ ...style, opacity: disabled ? 0.45 : 1 }}>
      {children}
    </button>
  );
}

// avatar iniziali per amici
function pastelFor(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}
function Avatar({ name, size = 34, ring = true }) {
  const h = pastelFor(name);
  const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 650, letterSpacing: 0.2, color: '#fff',
      background: `linear-gradient(140deg, oklch(0.72 0.14 ${h}), oklch(0.6 0.16 ${(h+40)%360}))`,
      boxShadow: ring ? '0 0 0 2px var(--avatar-ring), 0 2px 6px rgba(0,0,0,0.18)' : '0 2px 6px rgba(0,0,0,0.18)',
    }}>{initials}</div>
  );
}

// "poster" placeholder per ogni concerto: gradiente + iniziale + texture
function PosterArt({ concert, radius = 18, style = {}, big = false }) {
  const h = concert.hue ?? 250;
  const initials = concert.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: radius, flexShrink: 0,
      background: `linear-gradient(150deg, oklch(0.62 0.17 ${h}) 0%, oklch(0.5 0.16 ${(h+35)%360}) 55%, oklch(0.4 0.13 ${(h+70)%360}) 100%)`,
      ...style,
    }}>
      <div style={{ position: 'absolute', inset: 0, background:
        'radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.35), transparent 55%)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.14, mixBlendMode: 'overlay',
        backgroundImage: 'repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 8px)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.92)', fontWeight: 800, letterSpacing: 1,
        fontSize: big ? 52 : 22, textShadow: '0 2px 10px rgba(0,0,0,0.25)' }}>{initials}</div>
      {big && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.45))' }} />
      )}
    </div>
  );
}

// segmented control vetro (per filtri / tab interni)
function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map(o => {
        const val = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const active = val === value;
        return (
          <button key={val} onClick={() => onChange(val)}
            className={'seg-item' + (active ? ' seg-active' : '')}>{label}</button>
        );
      })}
    </div>
  );
}

// foglio modale che sale dal basso (bottom sheet)
function Sheet({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet glass" onClick={e => e.stopPropagation()}>
        <div className="sheet-grab" />
        {title && <div className="sheet-title">{title}</div>}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Glass, GlassButton, Avatar, PosterArt, Segmented, Sheet, pastelFor });
