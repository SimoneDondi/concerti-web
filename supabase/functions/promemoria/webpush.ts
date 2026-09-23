// webpush.ts — invio Web Push (RFC 8291 aes128gcm + VAPID RFC 8292) solo con WebCrypto,
// senza dipendenze: gira uguale su Deno (edge function) e su Node (test locali).

export type PushSubscription = { endpoint: string; p256dh: string; auth: string };
export type Vapid = { publicKey: string; privateJwk: JsonWebKey; subject: string };

const enc = new TextEncoder();

export function b64u(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64u(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
}

// Coppia di chiavi VAPID: la pubblica (raw, base64url) va nel client, la privata resta sul server.
export async function generateVapidKeys(): Promise<{ publicKey: string; privateJwk: JsonWebKey }> {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return {
    publicKey: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)),
    privateJwk: await crypto.subtle.exportKey('jwk', kp.privateKey),
  };
}

async function vapidHeader(endpoint: string, v: Vapid): Promise<string> {
  const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: v.subject,
  })));
  const key = await crypto.subtle.importKey('jwk', v.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  // WebCrypto restituisce la firma già in formato r||s, quello richiesto da ES256
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${v.publicKey}`;
}

// Cifra il payload per una subscription (un solo record aes128gcm).
export async function encryptPayload(sub: PushSubscription, payload: Uint8Array): Promise<Uint8Array> {
  const uaPublic = unb64u(sub.p256dh);
  const authSecret = unb64u(sub.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));

  const ikm = await hkdf(authSecret, ecdhSecret, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(payload, new Uint8Array([2]))));

  const rs = new Uint8Array([0, 0, 0x10, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

// Invia una notifica. Restituisce lo status HTTP del push service (201 = accettata;
// 404/410 = subscription scaduta, da eliminare).
export async function sendPush(sub: PushSubscription, data: unknown, v: Vapid, ttl = 86400): Promise<Response> {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(data)));
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(sub.endpoint, v),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttl),
      Urgency: 'normal',
    },
    body,
  });
}
