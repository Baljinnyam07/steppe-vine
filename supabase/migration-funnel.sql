-- Funnel tracking: count "added to cart". Run once in Supabase -> SQL Editor.
alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check
  check (type in ('visit','open_wine','open_order','order_sent','add_to_cart'));

-- new columns are added at the END so the existing views can simply be replaced
create or replace view public.daily_stats as
select created_at::date as day,
       count(distinct session_id) filter (where type = 'visit')      as visitors,
       count(*)                   filter (where type = 'open_wine')  as wine_views,
       count(*)                   filter (where type = 'open_order') as order_clicks,
       count(*)                   filter (where type = 'order_sent') as orders,
       count(distinct session_id) filter (where type = 'add_to_cart') as carts
  from public.events group by 1 order by 1 desc;

create or replace view public.wine_stats as
select wine_id,
       count(*) filter (where type = 'open_wine')  as views,
       count(*) filter (where type = 'open_order') as order_clicks,
       count(*) filter (where type = 'order_sent') as orders,
       count(*) filter (where type = 'add_to_cart') as adds
  from public.events where wine_id is not null group by 1 order by views desc;

alter view public.daily_stats set (security_invoker = true);
alter view public.wine_stats set (security_invoker = true);
grant select on public.daily_stats, public.wine_stats to authenticated;
