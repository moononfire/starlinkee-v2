-- =============================================================
-- Reset do stanu początkowego: usuwa wszystkich klientów,
-- subskrypcje, zamówienia, lokalizacje, recenzje itd.
-- Zachowuje: admins, products, subscription_details.
-- Import fizycznych płytek (plate_number + secret_key) z poprzedniej
-- wersji aplikacji został usunięty z repozytorium (sekrety płytek są
-- tajne, a repo jest publiczne). Dane produkcyjne ładuje się poza repo.
-- =============================================================

truncate table
  loyalty_otp,
  loyalty_cards,
  location_leads,
  scan_tokens,
  page_views,
  reviews,
  customer_location_links,
  customer_locations,
  order_items,
  shipments,
  orders,
  plates,
  subscriptions,
  customers
restart identity cascade;
