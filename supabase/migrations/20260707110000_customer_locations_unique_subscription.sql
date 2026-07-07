-- Prevent duplicate customer_locations rows for the same subscription.
-- The setup form always inserted a fresh row; if a subscription was reset to
-- "pending" for a re-run of setup without deleting its existing location,
-- getLocationBySubscriptionId's .single() would blow up on 2 rows and the
-- scan page would 404.
alter table customer_locations
  add constraint customer_locations_subscription_id_key unique (subscription_id);
