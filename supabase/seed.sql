-- =============================================================
-- Starlinkee v2 — Seed danych testowych
-- Uruchom w Supabase Dashboard → SQL Editor
-- =============================================================

-- ----------------------------------------------------------------
-- CUSTOMER
-- ----------------------------------------------------------------
insert into customers (customer_id, customer_type, customer_name, email, phone, preferred_language, country)
values (1, 'business', 'Test Restaurant GmbH', 'test@example.com', '+48123456789', 'pl', 'PL')
on conflict (customer_id) do nothing;

-- ----------------------------------------------------------------
-- SUBSCRIPTIONS
-- ----------------------------------------------------------------

-- 1. Aktywna subskrypcja (do testowania flow skanowania)
insert into subscriptions (subscription_id, customer_id, subscription_name, duration_in_days, status, activation_datetime, expiration_datetime)
values (1, 1, '1_YEAR_SUB', 365, 'active', now(), now() + interval '365 days')
on conflict (subscription_id) do nothing;

-- 2. Subskrypcja pending (do testowania setup form)
insert into subscriptions (subscription_id, customer_id, subscription_name, duration_in_days, status, activation_datetime, expiration_datetime)
values (2, 1, '1_YEAR_SUB', 365, 'pending', null, null)
on conflict (subscription_id) do nothing;

-- ----------------------------------------------------------------
-- PLATES
-- ----------------------------------------------------------------

-- Płytka aktywna — URL: /plate/ACTIVE/testsecretactive
insert into plates (plate_number, plate_language, secret_key, subscription_id)
values ('ACTIVE', 'pl', 'testsecretactive', 1)
on conflict (plate_number) do nothing;

-- Płytka pending — URL: /plate/PENDNG/testsecretpending
insert into plates (plate_number, plate_language, secret_key, subscription_id)
values ('PENDNG', 'pl', 'testsecretpending', 2)
on conflict (plate_number) do nothing;

-- Płytka nieprzypisana (inactive) — URL: /plate/NOSSUB/testsecretnosub
insert into plates (plate_number, plate_language, secret_key, subscription_id)
values ('NOSSUB', 'pl', 'testsecretnosub', null)
on conflict (plate_number) do nothing;

-- Płytka angielska aktywna — URL: /plate/ENACTL/testsecreteng
insert into plates (plate_number, plate_language, secret_key, subscription_id)
values ('ENACTL', 'en', 'testsecreteng', 1)
on conflict (plate_number) do nothing;

-- ----------------------------------------------------------------
-- CUSTOMER LOCATION (dla aktywnej subskrypcji)
-- ----------------------------------------------------------------
insert into customer_locations (
  location_id, subscription_id, location_name,
  google_business_name, google_business_address, city,
  google_review_link, support_email,
  linktree_slug, has_linktree_access, has_promo_enabled, has_loyalty_enabled,
  promo_banner_text, promo_sms_text, owner_email
)
values (
  1, 1, 'Restauracja Testowa',
  'Restauracja Testowa', 'ul. Testowa 1, Warszawa', 'Warszawa',
  'https://g.page/r/test-review-link',  -- zastąp prawdziwym linkiem
  'support@restauracjatestowa.pl',
  'testrestaurant', true, true, true,
  'Odbierz 10% zniżki na pierwsze zamówienie!',
  'Twoja zniżka: {link}',
  'owner@restauracjatestowa.pl'
)
on conflict (location_id) do nothing;

-- ----------------------------------------------------------------
-- LINKTREE LINKS (dla Fazy 2)
-- ----------------------------------------------------------------
insert into customer_location_links (customer_location_id, title, url, sort_order)
values
  (1, 'Menu', 'https://example.com/menu', 1),
  (1, 'Rezerwacje', 'https://example.com/rezerwacje', 2),
  (1, 'Facebook', 'https://facebook.com/testrestaurant', 3),
  (1, 'Instagram', 'https://instagram.com/testrestaurant', 4)
on conflict do nothing;

-- ----------------------------------------------------------------
-- Weryfikacja
-- ----------------------------------------------------------------
select 'customers' as tabela, count(*) from customers
union all select 'subscriptions', count(*) from subscriptions
union all select 'plates', count(*) from plates
union all select 'customer_locations', count(*) from customer_locations
union all select 'customer_location_links', count(*) from customer_location_links;
