create table review_messages (
  message_id serial primary key,
  review_id integer not null references reviews (review_id) on delete cascade,
  sender text not null check (sender in ('reporter', 'owner')),
  body text not null,
  created_at timestamptz not null default now()
);

create index review_messages_review_id_created_idx
  on review_messages (review_id, created_at);

alter table reviews
  add column owner_last_read_at timestamptz,
  add column reporter_last_read_at timestamptz;
