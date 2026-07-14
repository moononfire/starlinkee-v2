-- Every customer gets 100 free SMS credits per month, used for sending
-- review replies to reviewers who only left a phone number (no email), and
-- reserved for future marketing email sends. The window resets lazily: the
-- next credit-consuming action after sms_credits_reset_at rolls the counter
-- back to 0 and pushes the reset date forward by a month.
alter table customers
  add column sms_credits_used     integer not null default 0,
  add column sms_credits_reset_at timestamptz not null default (now() + interval '1 month');
