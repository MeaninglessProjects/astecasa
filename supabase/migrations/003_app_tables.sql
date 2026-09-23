-- 003 — Tabelle applicative: preferiti, contatti, sync PVP, storico prezzi, audit, log ricerche.

-- Preferiti utente (RLS: ogni utente vede/modifica solo i propri).
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  auction_id text not null references public.pvp_aste(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, auction_id)
);
alter table public.favorites enable row level security;
drop policy if exists "fav owner all" on public.favorites;
create policy "fav owner all" on public.favorites
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create index if not exists favorites_user_idx on public.favorites (user_id, created_at desc);

-- Richieste modulo contatti.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  auction_id text not null references public.pvp_aste(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  subject text,
  message text,
  status text not null default 'new'
    check (status in ('new','read','contacted','closed','sent','email_failed')),
  resend_message_id text,
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
-- Inserimento consentito ad anon/autenticati (form pubblico post-login); lettura solo service_role/admin.
drop policy if exists "contact insert any" on public.contact_messages;
create policy "contact insert any" on public.contact_messages
for insert to anon, authenticated with check (true);
revoke select, update, delete on public.contact_messages from anon, authenticated;
create index if not exists contact_auction_idx on public.contact_messages (auction_id, created_at desc);
create index if not exists contact_status_idx on public.contact_messages (status, created_at desc);

-- Stato sincronizzazione PVP (importazione MANUALE a blocchi, ripristinabile).
create table if not exists public.pvp_sync_state (
  source text primary key,
  mode text not null default 'backfill',
  next_page integer not null default 0,
  page_size integer not null default 100,
  total_pages integer,
  total_elements integer,
  last_page_synced integer,
  status text not null default 'idle'
    check (status in ('idle','running','completed','failed')),
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_run_count integer not null default 0,
  last_new_count integer not null default 0,
  last_updated_count integer not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);
alter table public.pvp_sync_state enable row level security;
revoke all on public.pvp_sync_state from anon, authenticated;

-- Storico prezzi (predisposto per andamento futuro; MAI inventato).
create table if not exists public.auction_price_history (
  id uuid primary key default gen_random_uuid(),
  auction_id text not null references public.pvp_aste(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  base_price numeric,
  minimum_offer numeric,
  source text not null default 'pvp-import',
  unique (auction_id, recorded_at, base_price, minimum_offer)
);
alter table public.auction_price_history enable row level security;
drop policy if exists "price history read" on public.auction_price_history;
create policy "price history read" on public.auction_price_history
for select to anon, authenticated using (true);
revoke insert, update, delete on public.auction_price_history from anon, authenticated;
create index if not exists price_hist_auction_idx on public.auction_price_history (auction_id, recorded_at);

-- Audit log azioni amministrative.
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon, authenticated;
create index if not exists audit_created_idx on public.admin_audit_logs (created_at desc);

-- Log ricerche (per statistica "numero ricerche" reale).
create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  filters jsonb not null default '{}'::jsonb,
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.search_logs enable row level security;
revoke all on public.search_logs from anon, authenticated;
create index if not exists search_logs_created_idx on public.search_logs (created_at desc);
