-- Track when a promo coupon was claimed (revealed) by the customer.
-- Powers a 15-minute countdown on the claim page that proves to staff
-- the code is live and not a screenshot.
alter table location_leads
  add column claimed_at timestamptz;
