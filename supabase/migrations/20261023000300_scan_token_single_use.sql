-- Scan tokens prove a recent NFC/QR tap. Each purpose can spend a token once,
-- so one tap cannot be replayed to send many promo SMS or collect many stamps.
alter table scan_tokens
  add column if not exists promo_used_at timestamptz,
  add column if not exists loyalty_used_at timestamptz;
