-- Run once in Supabase -> SQL Editor (for a database created from the first version of schema.sql).
-- Adds the email column and lets one order (same code) contain several wines.
alter table public.orders add column if not exists email text
  check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$');
alter table public.orders drop constraint if exists orders_code_key;
create unique index if not exists orders_code_wine on public.orders (code, wine_id);

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
