-- One customer per e-mail regardless of letter case (F6). The app now lowercases e-mails on write and
-- matches case-insensitively on read; this index makes the database enforce the same rule.
--
-- Rows already in the table are NOT rewritten. If duplicates by lower(trim(email)) exist the index cannot be
-- built: the migration then only warns and leaves the index out (so a deploy is not blocked). Resolve the
-- duplicates, then re-run the CREATE UNIQUE INDEX statement below by hand.
do $$
begin
  if exists (
    select 1 from customers where email is not null group by lower(trim(email)) having count(*) > 1
  ) then
    raise warning 'customers_email_lower_key NOT created: duplicate e-mails by lower(trim(email)) exist';
  else
    create unique index if not exists customers_email_lower_key on customers (lower(trim(email)))
      where email is not null;
  end if;
end $$;
