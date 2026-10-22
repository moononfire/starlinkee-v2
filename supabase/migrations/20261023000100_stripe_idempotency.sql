-- Stripe webhook idempotency + linking subscriptions to their Stripe origin.

create table if not exists stripe_events (
  event_id   text primary key,
  status     text not null default 'processing' check (status in ('processing', 'done', 'failed')),
  error      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Server-only table (service_role bypasses RLS); never exposed to anon/authenticated.
alter table stripe_events enable row level security;

alter table subscriptions
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_invoice_id text;

create index if not exists subscriptions_stripe_subscription_id_idx
  on subscriptions (stripe_subscription_id);
create index if not exists subscriptions_stripe_invoice_id_idx
  on subscriptions (stripe_invoice_id);

-- One order per Stripe invoice. Skipped (with a notice) if duplicates already
-- exist; clean them up first, then create the index by hand.
do $$
begin
  if exists (
    select 1 from orders
    where stripe_payment_id is not null
    group by stripe_payment_id
    having count(*) > 1
  ) then
    raise notice 'orders_stripe_payment_id_key NOT created: duplicate stripe_payment_id rows exist';
  else
    create unique index if not exists orders_stripe_payment_id_key
      on orders (stripe_payment_id) where stripe_payment_id is not null;
  end if;
end $$;
