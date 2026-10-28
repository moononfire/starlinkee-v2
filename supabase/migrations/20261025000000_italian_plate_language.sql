-- Italian ('it') on plate screens only. customers.preferred_language (mail, owner portal) is unchanged.

alter table public.customer_locations
  drop constraint if exists customer_locations_active_languages_valid;
alter table public.customer_locations
  add constraint customer_locations_active_languages_valid
  check (
    active_languages <@ array['pl','en','de','it']::text[]
    and array_length(active_languages, 1) > 0
  );

-- Inline column check from the initial schema; Postgres names it plates_plate_language_check.
alter table public.plates
  drop constraint if exists plates_plate_language_check;
alter table public.plates
  add constraint plates_plate_language_check
  check (plate_language in ('en', 'de', 'pl', 'it'));
