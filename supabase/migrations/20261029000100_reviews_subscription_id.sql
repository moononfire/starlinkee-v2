-- Reviews (and their message threads) belong to the subscription the plate was on WHEN THE GUEST SCANNED (F12).
-- Until now the owner was derived from plates.subscription_id as it is today, so re-assigning a plate (renewal
-- onto a new subscription, another customer) moved all old guest feedback, e-mails and phone numbers to the new owner.
alter table reviews
  add column if not exists subscription_id integer references subscriptions (subscription_id) on delete set null;

-- Existing rows: the plate's current subscription is the best information there is.
update reviews r
   set subscription_id = p.subscription_id
  from plates p
 where p.plate_id = r.plate_id
   and r.subscription_id is null
   and p.subscription_id is not null;

create index if not exists reviews_subscription_id_idx on reviews (subscription_id);
