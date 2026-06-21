-- Add scan_redirect_mode to customer_locations
-- Controls what happens when a plate is scanned: 'review' (direct to review) or 'linktree'
alter table customer_locations
  add column scan_redirect_mode text not null default 'review'
  check (scan_redirect_mode in ('review', 'linktree'));
