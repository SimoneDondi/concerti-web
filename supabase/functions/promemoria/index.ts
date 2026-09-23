// promemoria — notifica push "domani hai un concerto".
// - pg_cron la chiama ogni ora (header x-cron-secret): dalle 20 ora italiana in poi
//   notifica i concerti di domani; push_sent evita i doppioni, così un concerto
//   aggiunto in serata viene comunque avvisato all'ora successiva.
// - Dall'app, con la sessione dell'utente e body {test:true}: notifica di prova
//   ai dispositivi di quell'utente.
// Chiavi VAPID e segreto del cron stanno in public.app_secrets (RLS senza policy:
// le legge solo il service role).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendPush, type PushSubscription, type Vapid } from './webpush.ts';

const TZ = 'Europe/Rome';
const FROM_HOUR = 20;
const SUBJECT = 'https://simonedondi.github.io/concerti-web/';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// giorno e ora correnti in Italia
function romeNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}
function nextDay(day: string) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

type Sub = PushSubscription & { user_id: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } });

  const { data: rows, error: se } = await sb.from('app_secrets').select('name, value');
  if (se) return json({ error: se.message }, 500);
  const secret = Object.fromEntries(rows.map(r => [r.name, r.value]));
  const vapid: Vapid = { publicKey: secret.vapid_public, privateJwk: JSON.parse(secret.vapid_private_jwk), subject: SUBJECT };

  // invia a una lista di dispositivi; elimina quelli scaduti; true se almeno uno l'ha ricevuta
  async function deliver(subs: Sub[], msg: Record<string, string>) {
    let ok = false;
    for (const s of subs) {
      try {
        const res = await sendPush(s, msg, vapid);
        if (res.status === 404 || res.status === 410) await sb.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        else if (res.ok) ok = true;
        else console.error('push rifiutata', res.status, await res.text());
      } catch (e) { console.error('push fallita', e); }
    }
    return ok;
  }

  // ── notifica di prova, chiesta dall'app ──
  if (req.headers.get('x-cron-secret') == null) {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return json({ error: 'non autorizzato' }, 401);
    const { data: subs } = await sb.from('push_subscriptions').select('endpoint, p256dh, auth, user_id').eq('user_id', u.user.id);
    if (!subs?.length) return json({ error: 'nessun dispositivo registrato' }, 404);
    const ok = await deliver(subs, { title: 'Concerti', body: 'Notifiche attive: ti avviso la sera prima di ogni concerto.', tag: 'prova' });
    return ok ? json({ sent: subs.length }) : json({ error: 'il servizio push ha rifiutato la notifica' }, 502);
  }

  // ── giro orario da pg_cron ──
  if (!secret.cron_secret || req.headers.get('x-cron-secret') !== secret.cron_secret) return json({ error: 'forbidden' }, 403);
  const now = romeNow();
  if (now.hour < FROM_HOUR) return json({ skipped: `ore ${now.hour}, si parte alle ${FROM_HOUR}` });
  const tomorrow = nextDay(now.day);

  const { data: subs, error: pe } = await sb.from('push_subscriptions').select('endpoint, p256dh, auth, user_id');
  if (pe) return json({ error: pe.message }, 500);
  if (!subs.length) return json({ sent: 0 });

  const { data: concerts, error: ce } = await sb.from('concerti')
    .select('id, user_id, name:payload->>name, venue:payload->>venue, city:payload->>city, date:payload->>date')
    .in('user_id', [...new Set(subs.map(s => s.user_id))])
    .eq('deleted', false)
    .like('payload->>date', `${tomorrow}%`);
  if (ce) return json({ error: ce.message }, 500);
  if (!concerts.length) return json({ tomorrow, sent: 0 });

  // "prenota" gli invii: tornano solo i concerti non ancora notificati
  const { data: fresh, error: fe } = await sb.from('push_sent')
    .upsert(concerts.map(c => ({ user_id: c.user_id, concert_id: c.id, concert_day: tomorrow })),
      { onConflict: 'user_id,concert_id,concert_day', ignoreDuplicates: true })
    .select('user_id, concert_id');
  if (fe) return json({ error: fe.message }, 500);

  let sent = 0;
  for (const f of fresh) {
    const c = concerts.find(x => x.id === f.concert_id && x.user_id === f.user_id)!;
    const where = [c.venue, c.city].filter(Boolean).join(', ');
    const ok = await deliver(subs.filter(s => s.user_id === c.user_id), {
      title: `Domani: ${c.name}`,
      body: [(c.date || '').slice(11, 16), where].filter(Boolean).join(' · '),
      tag: `concerto-${c.id}`,
    });
    if (ok) sent++;
    // nessun dispositivo raggiunto: libera la prenotazione, si riprova al giro dopo
    else await sb.from('push_sent').delete().match({ user_id: c.user_id, concert_id: c.id, concert_day: tomorrow });
  }
  return json({ tomorrow, concerts: concerts.length, sent });
});
