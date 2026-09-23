-- 001 — Tabella principale PVP (idempotente: non distrugge dati esistenti).
-- La tabella public.pvp_aste esiste già con centinaia di migliaia di righe:
-- qui aggiungiamo solo colonne mancanti + indici + RLS.

create table if not exists public.pvp_aste (
  id text primary key,
  tipo_lotto text,
  categoria_lotto text,
  categoria_bene jsonb not null default '[]'::jsonb,
  via text,
  numero_civico text,
  cap text,
  comune text,
  provincia text,
  latitudine double precision,
  longitudine double precision,
  numero_lotto text,
  procedura text,
  prezzo_base numeric,
  offerta_minima numeric,
  rialzo_minimo numeric,
  data_vendita date,
  orario_vendita text,
  data_ora_vendita timestamptz,
  data_pubblicazione timestamptz,
  disponibilita jsonb not null default '[]'::jsonb,
  descrizione text,
  tribunale text,
  codice_tribunale text,
  esito text,
  raw jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Colonne che potrebbero mancare in DB già esistenti:
alter table public.pvp_aste add column if not exists first_seen_at timestamptz not null default now();
alter table public.pvp_aste add column if not exists last_seen_at timestamptz not null default now();
alter table public.pvp_aste add column if not exists updated_at timestamptz not null default now();
alter table public.pvp_aste add column if not exists raw jsonb;

-- Indici per filtri più usati + performance su centinaia di migliaia di record.
create index if not exists pvp_aste_data_ora_vendita_idx on public.pvp_aste (data_ora_vendita desc);
create index if not exists pvp_aste_comune_idx on public.pvp_aste (comune);
create index if not exists pvp_aste_provincia_idx on public.pvp_aste (provincia);
create index if not exists pvp_aste_cap_idx on public.pvp_aste (cap);
create index if not exists pvp_aste_prezzo_base_idx on public.pvp_aste (prezzo_base);
create index if not exists pvp_aste_offerta_minima_idx on public.pvp_aste (offerta_minima);
create index if not exists pvp_aste_tribunale_idx on public.pvp_aste (tribunale);
create index if not exists pvp_aste_categoria_lotto_idx on public.pvp_aste (categoria_lotto);
create index if not exists pvp_aste_data_pubbl_idx on public.pvp_aste (data_pubblicazione desc);
create index if not exists pvp_aste_coords_idx on public.pvp_aste (latitudine, longitudine);
-- Composito per la query principale (validità + provincia + data):
create index if not exists pvp_aste_valid_prov_data_idx
  on public.pvp_aste (provincia, data_ora_vendita desc) where data_ora_vendita is not null;
-- Full-text italiano su descrizione/comune/via per ricerca libera (opzionale ma utile):
do $$ begin
  if not exists (select 1 from pg_indexes where indexname = 'pvp_aste_search_trgm_idx') then
    create extension if not exists pg_trgm;
    create index pvp_aste_search_trgm_idx on public.pvp_aste
      using gin ((coalesce(comune,'') || ' ' || coalesce(descrizione,'') || ' ' || coalesce(via,'')) gin_trgm_ops);
  end if;
end $$;

alter table public.pvp_aste enable row level security;

drop policy if exists "pvp_aste public read" on public.pvp_aste;
create policy "pvp_aste public read"
on public.pvp_aste for select
to anon, authenticated
using (true);

-- Scritture vietate dal browser: solo service_role/server.
revoke insert, update, delete on public.pvp_aste from anon, authenticated;
grant select on public.pvp_aste to anon, authenticated;
