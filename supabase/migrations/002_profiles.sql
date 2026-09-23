-- 002 — Profili utenti + ruoli (user/admin). Verifica admin SEMPRE server-side.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles for select to authenticated
using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Il ruolo NON deve essere modificabile dal browser: nessuna policy di insert
-- lato client; la creazione avviene via trigger SECURITY DEFINER.
revoke insert, delete on public.profiles from anon, authenticated;

-- Trigger: crea profilo automaticamente a ogni signup (role='user' di default).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Per rendere admin un utente (DA ESEGUIRE come SQL editor / service_role):
--   update public.profiles set role = 'admin' where id = '<USER_UUID>';
