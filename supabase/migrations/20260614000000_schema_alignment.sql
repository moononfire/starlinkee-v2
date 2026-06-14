-- =============================================================
-- Starlinkee v2 — Schema alignment (2026-06-14)
-- =============================================================

-- ----------------------------------------------------------------
-- 1. Drop tables not needed in v2
-- ----------------------------------------------------------------
drop table if exists subscription_details cascade;
drop table if exists admins cascade;

-- ----------------------------------------------------------------
-- 2. products: rename creation_date → created_at
-- ----------------------------------------------------------------
alter table products rename column creation_date to created_at;

-- ----------------------------------------------------------------
-- 3. shipments: rename PK + expand with tracking fields
-- ----------------------------------------------------------------
alter table shipments rename column shipment_id to id;

alter table shipments
  add column if not exists number_of_plates  integer,
  add column if not exists tracking_number   text,
  add column if not exists carrier           text,
  add column if not exists shipping_status   text not null default 'pending'
      check (shipping_status in ('pending', 'shipped', 'delivered', 'cancelled')),
  add column if not exists batch_label       text,
  add column if not exists recipient_email   text,
  add column if not exists recipient_phone   text,
  add column if not exists shipping_cost     numeric(10, 2),
  add column if not exists shipped_at        timestamptz,
  add column if not exists delivered_at      timestamptz,
  add column if not exists updated_at        timestamptz not null default now();

create index if not exists shipments_order_id_idx     on shipments (order_id);
create index if not exists shipments_tracking_idx     on shipments (tracking_number) where tracking_number is not null;
create index if not exists shipments_batch_label_idx  on shipments (batch_label) where batch_label is not null;

create trigger shipments_updated_at
  before update on shipments
  for each row execute function set_updated_at();
