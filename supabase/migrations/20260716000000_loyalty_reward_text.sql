-- Optional custom text shown when a customer redeems/claims their loyalty
-- reward (per language, same convention as loyalty_card_text / promo texts).
alter table customer_locations
  add column if not exists loyalty_reward_text text,
  add column if not exists loyalty_reward_text_en text,
  add column if not exists loyalty_reward_text_de text;
