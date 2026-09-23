// push.jsx — promemoria push il giorno prima del concerto.
// Le notifiche le invia il server (edge function `promemoria`, ogni ora via pg_cron)
// leggendo le date dal backup: per questo servono l'accesso all'account e il sync.
// Su iPhone la Web Push funziona solo con l'app aperta dalla schermata Home (iOS 16.4+).

const VAPID_PUBLIC = 'BFQNbAE8v4l0kvJv657LCGd1st4whnuDAl05Wab0QW2IgVY9grL4fHojuRA72mrSYOOKvERvvbbcKrjw-YibvzY';

const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const swReady = pushSupported
  ? navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).catch((e) => { console.error('service worker', e); return null; })
  : Promise.resolve(null);

function vapidKeyBytes() {
  const s = VAPID_PUBLIC.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
}
function subRow(sub) {
  const j = sub.toJSON();
  return { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth };
}

// stato: 'unsupported' | 'install' (iPhone da Safari: va aperta dalla Home) | 'denied' | 'off' | 'on'
function usePushReminders(user) {
  const [state, setState] = React.useState(pushSupported ? 'off' : (navigator.standalone === false ? 'install' : 'unsupported'));
  const [busy, setBusy] = React.useState(false);
  const regRef = React.useRef(null);

  // allinea lo stato al dispositivo e ri-registra l'iscrizione sull'account attuale
  const uid = user && user.id;
  React.useEffect(() => {
    let alive = true;
    swReady.then(async (reg) => {
      if (!reg || !alive) return;
      regRef.current = reg;
      if (Notification.permission === 'denied') { setState('denied'); return; }
      const sub = await reg.pushManager.getSubscription();
      if (!alive) return;
      setState(sub ? 'on' : 'off');
      if (sub && uid) sbClient.rpc('save_push_subscription', subRow(sub)).then(({ error }) => error && console.error(error));
    });
    return () => { alive = false; };
  }, [uid]);

  async function enable() {
    const reg = regRef.current;
    if (!reg || busy) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission(); // su iOS va chiesto da un tocco
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes() });
      const { error } = await sbClient.rpc('save_push_subscription', subRow(sub));
      if (error) { await sub.unsubscribe(); throw error; }
      setState('on');
    } finally { setBusy(false); }
  }

  async function disable() {
    const reg = regRef.current;
    if (!reg) return;
    setBusy(true);
    try {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sbClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      setState('off');
    } finally { setBusy(false); }
  }

  async function test() {
    const { error } = await sbClient.functions.invoke('promemoria', { body: { test: true } });
    if (error) {
      let m = error.message;
      try { const j = await error.context.json(); if (j && j.error) m = j.error; } catch (e) {}
      throw new Error(m);
    }
  }

  return { state, busy, enable, disable, test };
}

// sezione del foglio "Backup su cloud" (solo con accesso fatto)
function ReminderSection({ push }) {
  const [msg, setMsg] = React.useState('');
  const run = (fn, ok) => async () => {
    setMsg('');
    try { await fn(); if (ok) setMsg(ok); } catch (e) { setMsg('Errore: ' + (e.message || e)); }
  };

  const help = {
    unsupported: 'Questo browser non supporta le notifiche push.',
    install: 'Per i promemoria apri Concerti dall\'icona nella schermata Home (serve iOS 16.4 o successivo).',
    denied: 'Notifiche bloccate: riattivale in Impostazioni › Notifiche › Concerti.',
    off: 'Una notifica la sera prima di ogni concerto, alle 20.',
    on: 'Attivi su questo dispositivo: ti avviso la sera prima di ogni concerto, alle 20.',
  }[push.state];

  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Promemoria</div>
      <p className="key-help">{help}</p>
      {push.state === 'off' && (
        <GlassButton accent onClick={run(push.enable)} disabled={push.busy} style={{ width: '100%', height: 48, marginTop: 10 }}>
          <Icon name="clock" size={18} /> {push.busy ? 'Attivazione…' : 'Attiva promemoria'}
        </GlassButton>
      )}
      {push.state === 'on' && (
        <React.Fragment>
          <GlassButton onClick={run(push.test, 'Notifica di prova inviata.')} disabled={push.busy} style={{ width: '100%', height: 48, marginTop: 10 }}>
            Invia una notifica di prova
          </GlassButton>
          <button className="link-btn" style={{ width: '100%', marginTop: 10 }} disabled={push.busy}
            onClick={run(push.disable)}>Disattiva promemoria</button>
        </React.Fragment>
      )}
      {msg && <p className="key-help" style={{ color: 'var(--accent)', marginTop: 8 }}>{msg}</p>}
    </div>
  );
}

Object.assign(window, { usePushReminders, ReminderSection });
