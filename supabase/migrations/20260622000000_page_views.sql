create table page_views (
  id bigint generated always as identity primary key,
  location_id integer references customer_locations(location_id) on delete set null,
  page_path text not null,
  page_type text not null,
  referrer text,
  user_agent text,
  session_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index idx_page_views_location on page_views(location_id);
create index idx_page_views_page_type on page_views(page_type);
create index idx_page_views_created_at on page_views(created_at);
