-- The owner (or Stripe) switched the renewal off: the Stripe subscription ends with the paid period.
-- Kept in sync by the customer.subscription.updated/deleted webhook; the portal shows "ends on <date>" from it.
alter table subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;
