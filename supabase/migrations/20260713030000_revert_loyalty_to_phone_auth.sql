-- Revert loyalty identity from Google/Supabase-auth-linked accounts back to
-- phone + SMS OTP. A Google account let one physical person create
-- unlimited loyalty cards per location (one per Google account they sign
-- into); phone number is enforced as the single identity going forward.
--
-- The phone is verified once, app-wide (not per location) — the companion
-- mobile app requires Google Sign-In then phone/SMS OTP a single time at
-- login, and that session then works across every location's loyalty card.
-- So loyalty_otp is keyed by phone alone, not (location_id, phone).
-- No production loyalty card has a customer_user_id yet, so this is a
-- clean revert.

create table loyalty_otp (
  phone      text primary key,
  otp_code   varchar(4) not null,
  expires_at timestamptz not null
);

alter table loyalty_cards
  drop constraint loyalty_cards_location_id_customer_user_id_key;

alter table loyalty_cards
  drop column customer_user_id;

alter table loyalty_cards
  alter column phone set not null;

alter table loyalty_cards
  add constraint loyalty_cards_location_id_phone_key unique (location_id, phone);
