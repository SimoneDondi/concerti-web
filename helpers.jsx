// helpers.jsx — dati di esempio, formattazione, .ics, mappe, persistenza, statistiche
// Esporta tutto su window per condividere lo scope tra i file Babel.

// ───────────────────────── Formattazione ─────────────────────────
const EURO = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const EURO2 = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
function fmtEuro(n) { return EURO.format(Math.round(n || 0)); }
function fmtEuro2(n) { return EURO2.format(n || 0); }

const MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const MESI_ABBR = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const GIORNI = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];

function parseDate(iso) { return new Date(iso); }
// "15 giu 2026" (giorno mese anno)
function fmtDate(iso) { const d = parseDate(iso); return `${d.getDate()} ${MESI_ABBR[d.getMonth()]} ${d.getFullYear()}`; }
// "sabato 20 giugno 2026"
function fmtDateLong(iso) { const d = parseDate(iso); return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`; }
function fmtTime(iso) { const d = parseDate(iso); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function fmtDayNum(iso) { return String(parseDate(iso).getDate()).padStart(2,'0'); }
function fmtMonthAbbr(iso) { return MESI_ABBR[parseDate(iso).getMonth()].toUpperCase(); }

const NOW = new Date(); // data reale del dispositivo
function isUpcoming(iso) { return parseDate(iso).getTime() >= NOW.getTime(); }
function daysUntil(iso) { return Math.ceil((parseDate(iso) - NOW) / 86400000); }

// ───────────────────────── Mappe ─────────────────────────
function gmapsUrl(q) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`; }
function appleMapsUrl(q) { return `https://maps.apple.com/?q=${encodeURIComponent(q)}`; }

// ───────────────────────── Calendario (.ics) ─────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }
function toICSDate(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}
function buildICS(c) {
  const start = parseDate(c.date);
  const end = new Date(start.getTime() + 3 * 3600000); // 3h durata stimata
  const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Concerti//IT', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:concerto-${c.id}@concerti.app`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${esc(c.name)}`,
    `LOCATION:${esc(c.venue + ', ' + c.address)}`,
    `DESCRIPTION:${esc('Venue: ' + c.venue + (c.friends && c.friends.length ? '\\nCon: ' + c.friends.join(', ') : '') + '\\nSpesa: ' + fmtEuro2(c.cost))}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}
function downloadICS(c) {
  const blob = new Blob([buildICS(c)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${c.name.replace(/[^\w]+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
// Apre direttamente l'app Calendario del telefono: su iPhone il data-URI .ics
// fa comparire la schermata nativa "Aggiungi al calendario"; su altri sistemi
// l'evento viene aperto/gestito dall'app calendario predefinita.
function openCalendar(c) {
  const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(buildICS(c));
  const w = window.open(dataUri, '_blank');
  if (!w) {
    const a = document.createElement('a');
    a.href = dataUri; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }
}

// ───────────────────────── Dati di esempio ─────────────────────────
// Tinte per i "poster" placeholder (gradiente vetro). hue per oklch.
const SEED = [
  { id:'c1', name:'Dua Lipa', date:'2026-06-20T21:00', cost:89, venue:'Ippodromo Snai La Maura', city:'Milano', address:'Via Lampugnano 95, Milano', friends:['Giulia','Marco'], genre:'Pop', hue:330 },
  { id:'c2', name:'Coldplay', date:'2026-07-12T20:30', cost:120, venue:'Stadio San Siro', city:'Milano', address:'Piazzale Angelo Moratti, Milano', friends:['Giulia','Sara','Luca'], genre:'Pop rock', hue:265 },
  { id:'c3', name:'Lana Del Rey', date:'2026-06-28T21:00', cost:95, venue:'Circo Massimo', city:'Roma', address:'Via del Circo Massimo, Roma', friends:['Giulia','Sara'], genre:'Indie pop', hue:20 },
  { id:'c4', name:'Marco Mengoni', date:'2026-06-05T21:00', cost:65, venue:'Unipol Arena', city:'Bologna', address:'Via Gino Cervi 2, Casalecchio di Reno', friends:['Chiara'], genre:'Pop', hue:200 },
  { id:'c5', name:'Tame Impala', date:'2026-05-18T21:30', cost:72, venue:'Mediolanum Forum', city:'Assago', address:'Via G. di Vittorio 6, Assago', friends:['Marco','Andrea'], genre:'Psych rock', hue:160, note:'Setlist pazzesca, chiusura con Let It Happen + coriandoli. Eravamo in tribiana lato palco, vista perfetta. Da rifare.' },
  { id:'c6', name:'Justice', date:'2026-05-02T22:00', cost:58, venue:'Carroponte', city:'Sesto San Giovanni', address:'Via Granelli 1, Sesto San Giovanni', friends:['Davide','Andrea'], genre:'Elettronica', hue:300 },
  { id:'c7', name:'Arctic Monkeys', date:'2026-04-26T21:00', cost:85, venue:'Visarno Arena', city:'Firenze', address:'Viale dell\'Aeronautica, Firenze', friends:['Luca','Giulia'], genre:'Rock', hue:10 },
  { id:'c8', name:'The Chemical Brothers', date:'2026-03-14T22:00', cost:55, venue:'Fabrique', city:'Milano', address:'Via Fantoli 9, Milano', friends:['Andrea','Davide'], genre:'Elettronica', hue:280 },
  { id:'c9', name:'Bicep', date:'2026-02-21T23:00', cost:40, venue:'Magnolia', city:'Milano', address:'Circonvallazione Idroscalo 41, Segrate', friends:['Davide'], genre:'Elettronica', hue:185 },
  { id:'c10', name:'Mahmood', date:'2026-01-30T21:00', cost:48, venue:'Mediolanum Forum', city:'Assago', address:'Via G. di Vittorio 6, Assago', friends:['Sara','Chiara'], genre:'Pop', hue:240 },
  { id:'c11', name:'Måneskin', date:'2025-07-08T21:00', cost:78, venue:'Stadio Olimpico', city:'Roma', address:'Viale dei Gladiatori, Roma', friends:['Marco','Luca'], genre:'Rock', hue:0 },
  { id:'c12', name:'Kendrick Lamar', date:'2025-06-30T21:00', cost:99, venue:'Ippodromo Snai La Maura', city:'Milano', address:'Via Lampugnano 95, Milano', friends:['Andrea'], genre:'Hip hop', hue:45 },
];

// ───────────────────────── Persistenza ─────────────────────────
const LS_KEY = 'concerti_v1';
function loadConcerts() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return arr; }
  } catch (e) {}
  return SEED.map(c => ({ ...c }));
}
function saveConcerts(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); }
  catch (e) { /* quota: i PDF possono essere grandi, ignoriamo */ }
}
function newId() { return 'c' + Math.random().toString(36).slice(2, 9); }

// chiave API Ticketmaster (salvata in locale)
function getApiKey() { try { return localStorage.getItem('tm_api_key') || ''; } catch (e) { return ''; } }
function setApiKey(k) { try { localStorage.setItem('tm_api_key', k); } catch (e) {} }

// ───────────────────────── Statistiche ─────────────────────────
function byYear(list, year) { return list.filter(c => parseDate(c.date).getFullYear() === year); }
function byMonth(list, year, month) { return list.filter(c => { const d = parseDate(c.date); return d.getFullYear() === year && d.getMonth() === month; }); }
function sumCost(list) { return list.reduce((s, c) => s + (Number(c.cost) || 0), 0); }

function topCities(list, n = 3) {
  const m = {};
  list.forEach(c => { if (c.city) m[c.city] = (m[c.city] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([city, count]) => ({ city, count }));
}
function topFriends(list, n = 5) {
  const m = {};
  list.forEach(c => (c.friends || []).forEach(f => { m[f] = (m[f] || 0) + 1; }));
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
}
function yearsPresent(list) {
  const ys = [...new Set(list.map(c => parseDate(c.date).getFullYear()))].sort((a, b) => b - a);
  return ys;
}
// spesa mensile per ogni mese di un anno (per il grafico)
function monthlySpend(list, year) {
  const arr = new Array(12).fill(0);
  byYear(list, year).forEach(c => { arr[parseDate(c.date).getMonth()] += Number(c.cost) || 0; });
  return arr;
}

Object.assign(window, {
  fmtEuro, fmtEuro2, fmtDate, fmtDateLong, fmtTime, fmtDayNum, fmtMonthAbbr,
  MESI, MESI_ABBR, GIORNI, NOW, parseDate, isUpcoming, daysUntil,
  gmapsUrl, appleMapsUrl, buildICS, downloadICS, openCalendar,
  SEED, loadConcerts, saveConcerts, newId, getApiKey, setApiKey,
  byYear, byMonth, sumCost, topCities, topFriends, yearsPresent, monthlySpend,
});
