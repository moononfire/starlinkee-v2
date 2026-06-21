-- Scan tokens: enforce physical presence for promo claims
create table scan_tokens (
  id          serial primary key,
  location_id integer not null references customer_locations (location_id),
  token       text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index scan_tokens_token_idx on scan_tokens (token);

-- Coupon codes: staff-verified redemption
alter table location_leads
  add column coupon_code text unique;

create index location_leads_coupon_code_idx
  on location_leads (coupon_code) where coupon_code is not null;
