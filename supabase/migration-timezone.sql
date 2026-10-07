-- Fixes "today's row is missing" in daily_stats: it grouped by UTC date, so anything before ~08:00
-- Ulaanbaatar time still counted as "yesterday". Run once in Supabase -> SQL Editor.
create or replace view public.daily_stats as
select (created_at at time zone 'Asia/Ulaanbaatar')::date as day,
       count(distinct session_id) filter (where type = 'visit')       as visitors,
       count(*)                   filter (where type = 'open_wine')   as wine_views,
       count(*)                   filter (where type = 'open_order')  as order_clicks,
       count(*)                   filter (where type = 'order_sent')  as orders,
       count(distinct session_id) filter (where type = 'add_to_cart') as carts
  from public.events group by 1 order by 1 desc;

alter view public.daily_stats set (security_invoker = true);
grant select on public.daily_stats to authenticated;
