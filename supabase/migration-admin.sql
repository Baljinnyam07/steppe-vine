-- Admin window (/#/admin). Run once in Supabase -> SQL Editor.
--
-- BEFORE running: replace YOUR-ADMIN-EMAIL@example.com below with the email you will sign in with, and
-- create that user in Supabase -> Authentication -> Users -> "Add user" (email + password, tick "Auto Confirm").
-- Then Authentication -> Sign In / Providers -> turn OFF "Allow new users to sign up".

create table if not exists public.admins (email text primary key);
insert into public.admins (email) values ('YOUR-ADMIN-EMAIL@example.com') on conflict do nothing;
alter table public.admins enable row level security;   -- no policies: nobody can read the list through the API

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- the admin can read orders / events and change an order's status; nobody else can
grant select on public.orders, public.events to authenticated;
grant update (status) on public.orders to authenticated;

drop policy if exists "admin reads orders" on public.orders;
create policy "admin reads orders" on public.orders for select to authenticated using (public.is_admin());
drop policy if exists "admin updates orders" on public.orders;
create policy "admin updates orders" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin reads events" on public.events;
create policy "admin reads events" on public.events for select to authenticated using (public.is_admin());

-- the stats views run with the caller's rights, so the policies above decide who sees them
alter view public.daily_stats set (security_invoker = true);
alter view public.wine_stats set (security_invoker = true);
grant select on public.daily_stats, public.wine_stats to authenticated;

-- the admin may also browse the shop while signed in: let that role place orders / log events too
drop policy if exists "anyone can place an order" on public.orders;
create policy "anyone can place an order" on public.orders for insert to anon, authenticated with check (status = 'new');
drop policy if exists "anyone can log an event" on public.events;
create policy "anyone can log an event" on public.events for insert to anon, authenticated with check (true);
