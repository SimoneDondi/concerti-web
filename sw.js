// sw.js — service worker: mostra i promemoria push e apre l'app al tocco.
// Nessun handler fetch: la rete resta com'è, niente cache offline.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Concerti', {
    body: data.body || '',
    icon: 'icon-180.png',
    tag: data.tag,
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    const w = wins.find(c => 'focus' in c);
    return w ? w.focus() : self.clients.openWindow('./');
  }));
});
