-- Lifebrained: one-time database setup.
-- In your Supabase project open SQL Editor, start a new query, paste this whole file, and press Run.
-- It is safe to run again; it only creates what is missing and resets the access rules.

-- Each person's data: one row per account.
create table if not exists public.lifebrained_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  rev        bigint not null default 1,
  updated_at timestamptz not null default now()
);

-- Automatic daily copies, plus the version that loses when two devices disagree.
create table if not exists public.lifebrained_backups (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists lifebrained_backups_user_created
  on public.lifebrained_backups (user_id, created_at desc);

-- Only signed-in people, and only their own rows.
alter table public.lifebrained_state   enable row level security;
alter table public.lifebrained_backups enable row level security;

drop policy if exists "Own data: read"   on public.lifebrained_state;
drop policy if exists "Own data: add"    on public.lifebrained_state;
drop policy if exists "Own data: change" on public.lifebrained_state;
create policy "Own data: read"   on public.lifebrained_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own data: add"    on public.lifebrained_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own data: change" on public.lifebrained_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Own backups: read"   on public.lifebrained_backups;
drop policy if exists "Own backups: add"    on public.lifebrained_backups;
drop policy if exists "Own backups: remove" on public.lifebrained_backups;
create policy "Own backups: read"   on public.lifebrained_backups for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own backups: add"    on public.lifebrained_backups for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own backups: remove" on public.lifebrained_backups for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update on public.lifebrained_state   to authenticated;
grant select, insert, delete on public.lifebrained_backups to authenticated;
revoke all on public.lifebrained_state   from anon;
revoke all on public.lifebrained_backups from anon;
