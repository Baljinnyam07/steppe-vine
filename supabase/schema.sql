-- Steppe & Vine: run this once in Supabase -> SQL Editor -> New query -> Run.

-- ---------- orders ----------
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  code       text not null,                              -- shown to the customer, e.g. SV-A1B2C3 (one row per wine, shared by an order)
  wine_id    text not null,
  wine       text not null,
  qty        int  not null check (qty between 1 and 3),  -- max 3 bottles per order
  name       text not null check (char_length(name) between 2 and 80),
  phone      text not null check (phone ~ '^[0-9]{8}$'),
  email      text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  note       text not null default '' check (char_length(note) <= 500),
  status     text not null default 'new' check (status in ('new','confirmed','delivered','cancelled')),
  created_at timestamptz not null default now()
);
create unique index if not exists orders_code_wine on public.orders (code, wine_id);
create index if not exists orders_phone_wine on public.orders (phone, wine_id);

-- One customer (phone number) may order at most 3 bottles of the same wine in total.
create or replace function public.orders_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare already int;
begin
  select coalesce(sum(qty), 0) into already
    from public.orders
   where phone = new.phone and wine_id = new.wine_id and status <> 'cancelled';
  if already + new.qty > 3 then
    raise exception 'LIMIT_3' using errcode = 'P0001', detail = new.wine;
  end if;
  return new;
end $$;

drop trigger if exists orders_limit_trg on public.orders;
create trigger orders_limit_trg before insert on public.orders
  for each row execute function public.orders_limit();

alter table public.orders enable row level security;
drop policy if exists "anyone can place an order" on public.orders;
create policy "anyone can place an order" on public.orders
  for insert to anon with check (status = 'new');
-- No select/update/delete policy: visitors can never read orders. You read them in the dashboard.

-- ---------- visit / click tracking ----------
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  type       text not null check (type in ('visit','open_wine','open_order','order_sent')),
  wine_id    text,
  session_id text not null,
  device     text,
  referrer   text,
  created_at timestamptz not null default now()
);
create index if not exists events_created on public.events (created_at);

alter table public.events enable row level security;
drop policy if exists "anyone can log an event" on public.events;
create policy "anyone can log an event" on public.events for insert to anon with check (true);

-- ---------- reports (only you see these in the dashboard, not visitors) ----------
create or replace view public.daily_stats as
select created_at::date as day,
       count(distinct session_id) filter (where type = 'visit')      as visitors,
       count(*)                   filter (where type = 'open_wine')  as wine_views,
       count(*)                   filter (where type = 'open_order') as order_clicks,
       count(*)                   filter (where type = 'order_sent') as orders
  from public.events group by 1 order by 1 desc;

create or replace view public.wine_stats as
select wine_id,
       count(*) filter (where type = 'open_wine')  as views,
       count(*) filter (where type = 'open_order') as order_clicks,
       count(*) filter (where type = 'order_sent') as orders
  from public.events where wine_id is not null group by 1 order by views desc;

revoke all on public.daily_stats, public.wine_stats from anon, authenticated;
revoke select on public.orders, public.events from anon, authenticated;
