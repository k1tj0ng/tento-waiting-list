-- =========================================================
-- Tento Waitlist — ephemeral live queue
-- Run this in the Supabase SQL Editor.
-- =========================================================

-- 1. TABLE -------------------------------------------------
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  group_size smallint not null check (group_size between 1 and 10),
  phone      text not null check (char_length(phone) between 5 and 20),
  status     text not null default 'waiting' check (status in ('waiting')),
  created_at timestamptz not null default now()
);

create index if not exists waitlist_created_at_idx
  on public.waitlist (created_at asc);

-- 2. REALTIME ----------------------------------------------
alter publication supabase_realtime add table public.waitlist;

-- Required so DELETE events carry the full old row (needed for dashboard/customer tab).
alter table public.waitlist replica identity full;

-- 3. ROW LEVEL SECURITY ------------------------------------
alter table public.waitlist enable row level security;

-- Anon can add themselves to the queue.
create policy "anon can insert"
  on public.waitlist
  for insert
  to anon
  with check (true);

-- Anon can read the queue (dashboard + customer status).
create policy "anon can select"
  on public.waitlist
  for select
  to anon
  using (true);

-- Anon can delete (host "Seat Party" hard-deletes the record).
-- To harden: restrict to authenticated role and gate /dashboard with auth.
create policy "anon can delete"
  on public.waitlist
  for delete
  to anon
  using (true);

-- No UPDATE policy: rows are insert-then-delete only.

-- Required when "Automatically expose new tables" is disabled in Supabase settings.
grant usage on schema public to anon;
grant select, insert, delete on public.waitlist to anon;

-- 4. NIGHTLY HARD WIPE via pg_cron -------------------------
-- Enable the extension first: Database -> Extensions -> pg_cron (toggle on).
create extension if not exists pg_cron;

-- Primary wipe: 23:59 AEST (13:59 UTC). Adjust for AEDT (12:59 UTC) if needed.
select cron.schedule(
  'tento-nightly-wipe',
  '59 13 * * *',
  $$ truncate table public.waitlist $$
);

-- DST-aware alternative (uncomment to use instead of the job above):
-- select cron.unschedule('tento-nightly-wipe');
-- select cron.schedule(
--   'tento-nightly-wipe-dst',
--   '59 * * * *',
--   $$
--     do $body$
--     begin
--       if to_char(now() at time zone 'Australia/Sydney', 'HH24') = '23' then
--         truncate table public.waitlist;
--       end if;
--     end
--     $body$;
--   $$
-- );

-- To inspect / remove cron jobs later:
--   select * from cron.job;
--   select cron.unschedule('tento-nightly-wipe');
