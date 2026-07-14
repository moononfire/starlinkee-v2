-- Redeeming a full loyalty card now goes through a staff-verified code at
-- /verify, mirroring the existing promo coupon flow (location_leads). The
-- card keeps its stamps until a staff member confirms the code within the
-- 15-minute window (enforced in application code, matching location_leads'
-- claimed_at pattern) — if the window lapses unconfirmed, the stamps were
-- never touched, so the card is simply claimable again.
alter table loyalty_cards
  add column redeem_code         text,
  add column redeem_requested_at timestamptz,
  add column redeem_used_at      timestamptz;
