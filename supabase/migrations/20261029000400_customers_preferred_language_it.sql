-- Italian is a full owner language now (portal and e-mails): customers can have preferred_language = 'it'.
-- Inline column check from the initial schema; Postgres names it customers_preferred_language_check.
alter table public.customers
  drop constraint if exists customers_preferred_language_check;
alter table public.customers
  add constraint customers_preferred_language_check
  check (preferred_language in ('en', 'de', 'pl', 'it'));
