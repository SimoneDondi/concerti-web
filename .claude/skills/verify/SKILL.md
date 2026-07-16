---
name: verify
description: Come lanciare e guidare la web app Concerti per verificare le modifiche end-to-end.
---

# Verifica della web app Concerti

App statica (HTML + JSX compilato da Babel standalone nel browser, React da unpkg — serve rete). Nessuna build.

## Lancio

```bash
python3 -m http.server 8123   # dalla root del repo, in background
```

## Guida (browser headless)

Niente Playwright installato globalmente: usare `playwright-core` (npm, ~2s) puntato al Chrome di sistema:

```js
const { chromium } = require('playwright-core');
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const ctx = await browser.newContext({ viewport: { width: 402, height: 874 } });
```

- Attendere `.tabbar` come segnale di app pronta (Babel impiega qualche secondo).
- `index.html` imposta `window.__PHONE__ = true`: l'app è renderizzata diretta, senza mockup iPhone.
- Bottone "+" per nuovo concerto: `page.locator('button.theme-btn.round-btn').first()`.
- Form: input per placeholder (`es. Dua Lipa`, `es. Stadio San Siro`, `es. Milano`), data `input[type="date"]`, salva con `button.link-btn.strong`. Campi obbligatori: nome, data, venue, città.
- Contesti Playwright separati = storage separato (utile per testare stato pulito / migrazioni).

## Persistenza (cosa controllare)

- Dati in IndexedDB: db `concerti`, store `kv`, chiave `concerti_v1` (array di concerti).
- `localStorage['concerti_v1']` esiste solo come sorgente di migrazione legacy: dopo la migrazione viene rimosso.
- Lista vuota salvata = niente ri-seed dei dati di esempio al reload.
- `loadConcerts`/`saveConcerts` sono esposti su `window` (comodi per probe via `page.evaluate`).

## Sync cloud (Supabase)

- Backend: progetto Supabase dedicato `concerti` (lpvckprrcvxmkbyxukru, account personale "Momo Org"), tabella `public.concerti` (righe per utente via RLS, tombstone `deleted=true`). URL e publishable key sono hardcoded in sync.jsx.
- La registrazione passa dalla edge function `signup` (crea l'account già confermato via admin API): il signup diretto GoTrue fallirebbe con `email_address_invalid` perché l'SMTP integrato consegna solo ai membri del team. Il test può creare account `claude-verify-<ts>@example.org` e a fine verifica eliminarli con `delete from auth.users where email like 'claude-verify-%'` (cascade sulle righe).
- Bottone cloud = primo dei tre `button.theme-btn.round-btn`; il foglio backup è `.sheet`.
- Playwright: NON usare `text=Accedi` (combacia col testo di aiuto) — usare `.sheet button.btn-accent`. Per il confirm di eliminazione usare `page.locator('.sheet button', { hasText: 'Elimina' })` (il titolo "Eliminare il concerto?" è un div).
- Push debounced 1.5s: attendere ~4s dopo una modifica prima di controllare il server.

## Gotcha

- Bump di `?v=` in index.html quando si tocca un file .jsx (convenzione cache-busting del repo).
- Controllare `pageerror` e console error: errori Babel di sintassi compaiono lì, non a terminale.
