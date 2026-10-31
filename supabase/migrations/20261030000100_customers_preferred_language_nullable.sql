-- preferred_language may be empty: "no language chosen yet" lets the owner language fall back to the plate's
-- language (ownerLanguage: preferred_language -> plate_language -> en). The check from the Italian migration stays;
-- NULL passes a check constraint. Existing rows keep their value.
alter table customers
  alter column preferred_language drop not null,
  alter column preferred_language drop default;
