-- Linktree visits are counted once per physical scan: the token records
-- when its visit was counted so back-navigation doesn't inflate the counter.
alter table scan_tokens
  add column visit_counted_at timestamptz;
