alter table customer_locations
  add column active_languages text[] not null default array['pl','en','de'];

alter table customer_locations
  add constraint customer_locations_active_languages_valid
  check (
    active_languages <@ array['pl','en','de']::text[]
    and array_length(active_languages, 1) > 0
  );
