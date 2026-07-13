-- Replace phone+SMS OTP loyalty auth with Google Sign-In (via Supabase Auth).
-- Google/Supabase already verifies the customer's identity, so the local
-- OTP table is no longer needed, and loyalty cards are keyed by the
-- Supabase auth user id instead of a phone number.

alter table loyalty_cards
  add column customer_user_id uuid references auth.users (id),
  alter column phone drop not null;

alter table loyalty_cards
  drop constraint loyalty_cards_location_id_phone_key;

alter table loyalty_cards
  add constraint loyalty_cards_location_id_customer_user_id_key
  unique (location_id, customer_user_id);

drop table loyalty_otp;
