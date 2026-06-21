ALTER TABLE customers
  ADD COLUMN activation_token TEXT UNIQUE,
  ADD COLUMN is_activated BOOLEAN NOT NULL DEFAULT false;
