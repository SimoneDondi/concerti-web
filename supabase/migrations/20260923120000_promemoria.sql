-- Promemoria push il giorno prima del concerto (vedi supabase/functions/promemoria).
-- Le chiavi VAPID si inseriscono a parte in app_secrets (vapid_public, vapid_private_jwk):
-- la privata non deve finire nel repo.

-- dispositivi iscritti alle notifiche
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
create policy "leggo i miei dispositivi" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "elimino i miei dispositivi" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- registra il dispositivo, o lo riassegna all'utente corrente: un endpoint
-- appartiene a chi si è iscritto per ultimo da quel telefono
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language sql security definer set search_path = '' as $$
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
$$;
revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- notifiche già inviate (una per concerto e giorno)
create table public.push_sent (
  user_id uuid not null references auth.users(id) on delete cascade,
  concert_id text not null,
  concert_day date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, concert_id, concert_day)
);
alter table public.push_sent enable row level security; -- nessuna policy: solo service role
revoke all on public.push_sent from anon, authenticated;

-- segreti lato server
create table public.app_secrets (name text primary key, value text not null);
alter table public.app_secrets enable row level security; -- nessuna policy: solo service role
revoke all on public.app_secrets from anon, authenticated;
insert into public.app_secrets (name, value)
values ('cron_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));

-- giro orario; la funzione decide se è ora di notificare (dalle 20 ora italiana)
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('promemoria-concerti', '0 * * * *', $$
  select net.http_post(
    url := 'https://lpvckprrcvxmkbyxukru.supabase.co/functions/v1/promemoria',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_secrets where name = 'cron_secret')),
    body := '{}'::jsonb
  );
$$);
