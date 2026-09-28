-- Full analytics. Run once in Supabase -> SQL Editor (after schema.sql and migration-admin.sql).
-- Adds who / where from / what details to `events`, and allows the new event types.

alter table public.events add column if not exists visitor_id text;
alter table public.events add column if not exists source     text;
alter table public.events add column if not exists meta       jsonb;

alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check check (type in (
  'visit','open_wine','open_order','order_sent','add_to_cart',
  'remove_from_cart','qty_change','scroll','wine_dwell','zoom_poster','gallery_page',
  'form_start','form_error','order_failed','click_social','leave'
));
alter table public.events drop constraint if exists events_meta_size;
alter table public.events add constraint events_meta_size check (meta is null or pg_column_size(meta) < 2000);

create index if not exists events_visitor on public.events (visitor_id);
create index if not exists events_type_time on public.events (type, created_at);

-- (the admin already has read access to events from migration-admin.sql; visitors can still only insert)
