-- Per-location loyalty program settings: how many stamps a customer must
-- collect for a reward (5-10) and an optional custom text shown on the card
-- (per language, same convention as promo texts).
alter table customer_locations
  add column if not exists loyalty_stamps_required integer not null default 10
    check (loyalty_stamps_required between 5 and 10),
  add column if not exists loyalty_card_text text,
  add column if not exists loyalty_card_text_en text,
  add column if not exists loyalty_card_text_de text;
