-- Activation code for anonymous plate setup (/api/plate/setup).
-- Only the SHA-256 hash is stored; the plain code is emailed to the customer
-- when a plate is assigned to their subscription.
alter table subscriptions
  add column if not exists activation_code_hash text;
