-- Italian per-language content for /l/* (additive, nullable, no defaults).
alter table customer_location_links
  add column if not exists title_it text;

alter table customer_locations
  add column if not exists promo_description_it text,
  add column if not exists promo_banner_text_it text,
  add column if not exists promo_sms_text_it text,
  add column if not exists loyalty_card_text_it text,
  add column if not exists loyalty_reward_text_it text,
  add column if not exists loyalty_banner_text_it text,
  add column if not exists wifi_banner_text_it text,
  add column if not exists menu_banner_text_it text,
  add column if not exists review_banner_text_it text;
