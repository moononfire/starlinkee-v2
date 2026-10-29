-- The language the guest used when leaving feedback (the plate screens are shown in the guest's own choice,
-- which may differ from plates.plate_language). Replies from the owner are e-mailed in this language;
-- NULL (older rows) falls back to the plate's language.
alter table reviews
  add column if not exists guest_language text
  check (guest_language is null or guest_language in ('en', 'de', 'pl', 'it'));
