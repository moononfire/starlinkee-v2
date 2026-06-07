-- =============================================================
-- Starlinkee v2 — Initial Schema
-- =============================================================

-- ----------------------------------------------------------------
-- ADMINS
-- ----------------------------------------------------------------
create table admins (
  id         serial primary key,
  username   text not null unique,
  password   text not null  -- bcrypt hash
);

-- ----------------------------------------------------------------
-- CUSTOMERS
-- ----------------------------------------------------------------
create table customers (
  customer_id         serial primary key,
  customer_type       text not null check (customer_type in ('business', 'individual')),
  source              text not null default 'Admin dashboard',
  company_name        text,
  tax_id              text,
  customer_name       text not null,
  email               text not null,
  phone               text,
  billing_address     text,
  preferred_language  text not null default 'en' check (preferred_language in ('en', 'de', 'pl')),
  country             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- SUBSCRIPTIONS
-- ----------------------------------------------------------------
create table subscriptions (
  subscription_id     serial primary key,
  customer_id         integer not null references customers (customer_id),
  subscription_name   text not null,
  duration_in_days    integer not null,
  is_free             boolean not null default false,
  activation_datetime timestamptz,   -- null while status = 'pending'
  expiration_datetime timestamptz,   -- null while status = 'pending'
  status              text not null default 'pending' check (status in ('pending', 'active', 'inactive')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- PLATES
-- ----------------------------------------------------------------
create table plates (
  plate_id         serial primary key,
  subscription_id  integer references subscriptions (subscription_id),  -- nullable = unassigned
  plate_number     varchar(6) not null unique,
  plate_language   text not null default 'en' check (plate_language in ('en', 'de', 'pl')),
  number_of_visits integer not null default 0,
  secret_key       text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index plates_subscription_id_idx on plates (subscription_id);

-- ----------------------------------------------------------------
-- PRODUCTS
-- ----------------------------------------------------------------
create table products (
  product_id        integer primary key,
  category          text not null check (category in ('subscription', 'plate', 'shipping')),
  name              text not null,
  description       text,
  is_free           boolean not null default false,
  price             numeric(10, 2) not null default 0,
  stripe_product_id text,
  stripe_price_id   text,
  creation_date     timestamptz not null default now()
);

insert into products (product_id, category, name, description, is_free, price, stripe_product_id, stripe_price_id) values
  (0, 'subscription', '1_WEEK_SUB_FREE',                '1 week free trial',         true,  0.00, null, null),
  (1, 'subscription', '1_YEAR_SUB',                     '1 year subscription',        false, 59.00, 'prod_RjJBsl7yqs0LtL', 'price_1PyFyjHqQ7RAMwElWtGmSucN'),
  (2, 'plate',        'PLATE',                          'NFC/QR plate',               false, 19.90, null, null),
  (3, 'shipping',     'DOMESTIC_SHIPPING_AUSTRIA',       'Domestic shipping (AT)',      true,  0.00, null, null),
  (4, 'shipping',     'INTERNATIONAL_SHIPPING_EUROPE',   'International shipping (EU)', true,  0.00, null, null),
  (5, 'subscription', '2_WEEKS_FREE_SUB',               '2 weeks free trial',         true,  0.00, null, null),
  (6, 'subscription', '10_DAYS_FREE_SUB',               '10 days free trial',         true,  0.00, null, null);

-- ----------------------------------------------------------------
-- SUBSCRIPTION DETAILS
-- ----------------------------------------------------------------
create table subscription_details (
  id               serial primary key,
  product_id       integer not null references products (product_id),
  duration_in_days integer not null,
  is_free          boolean not null default false
);

insert into subscription_details (product_id, duration_in_days, is_free) values
  (0, 7,   true),
  (1, 365, false),
  (5, 14,  true),
  (6, 10,  true);

-- ----------------------------------------------------------------
-- ORDERS
-- ----------------------------------------------------------------
create table orders (
  order_id                    serial primary key,
  customer_id                 integer not null references customers (customer_id),
  status                      text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  payment_method              text check (payment_method in ('stripe', 'bank_transfer', 'cash')),
  stripe_payment_id           text,
  stripe_payment_intent_id    text,
  internal_payment_reference  text,
  created_at                  timestamptz not null default now(),
  fulfilled_at                timestamptz
);

create index orders_customer_id_idx on orders (customer_id);

-- ----------------------------------------------------------------
-- ORDER ITEMS
-- ----------------------------------------------------------------
create table order_items (
  order_item_id  serial primary key,
  order_id       integer not null references orders (order_id),
  product_id     integer not null references products (product_id),
  quantity       integer not null default 1
);

-- ----------------------------------------------------------------
-- CUSTOMER LOCATIONS
-- ----------------------------------------------------------------
create table customer_locations (
  location_id             serial primary key,
  subscription_id         integer not null references subscriptions (subscription_id),
  location_name           text not null,
  google_business_name    text,
  google_business_address text,
  city                    text,
  postal_code             text,
  country                 text,
  google_review_link      text,
  google_places_id        text,
  support_email           text,
  logo_path               text,   -- Supabase Storage path
  logo_link               text,   -- public URL
  linktree_slug           text unique,
  linktree_visits         integer not null default 0,
  has_linktree_access     boolean not null default false,
  has_promo_enabled       boolean not null default false,
  has_loyalty_enabled     boolean not null default false,
  promo_banner_text       text,
  promo_sms_text          text,
  owner_email             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index customer_locations_subscription_id_idx on customer_locations (subscription_id);
create index customer_locations_linktree_slug_idx   on customer_locations (linktree_slug);

-- ----------------------------------------------------------------
-- CUSTOMER LOCATION LINKS  (linktree links)
-- ----------------------------------------------------------------
create table customer_location_links (
  id                   serial primary key,
  customer_location_id integer not null references customer_locations (location_id) on delete cascade,
  title                text not null,
  url                  text not null,
  sort_order           integer not null default 0
);

-- ----------------------------------------------------------------
-- REVIEWS
-- ----------------------------------------------------------------
create table reviews (
  review_id       serial primary key,
  plate_id        integer not null references plates (plate_id),
  scan_id         text not null unique,  -- crypto.randomUUID()
  scan_time       timestamptz not null default now(),
  rating          integer check (rating between 1 and 5),
  rating_time     timestamptz,
  feedback_message text,
  contact_email   text,
  contact_phone   text,
  user_name       text,
  feedback_time   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index reviews_plate_id_idx on reviews (plate_id);
create index reviews_scan_id_idx  on reviews (scan_id);

-- ----------------------------------------------------------------
-- SHIPMENTS
-- ----------------------------------------------------------------
create table shipments (
  shipment_id     serial primary key,
  order_id        integer not null references orders (order_id),
  recipient_name  text,
  address_line1   text,
  address_line2   text,
  city            text,
  postal_code     text,
  country         text,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- LOCATION LEADS  (promo / squeeze page)
-- ----------------------------------------------------------------
create table location_leads (
  id              serial primary key,
  location_id     integer not null references customer_locations (location_id),
  phone           text not null,
  email           text,
  agreed_to_terms boolean not null default false,
  claim_token     text not null unique,
  is_used         boolean not null default false,
  used_at         timestamptz,
  created_at      timestamptz not null default now(),
  -- one phone per location
  unique (location_id, phone)
);

-- ----------------------------------------------------------------
-- LOYALTY CARDS
-- ----------------------------------------------------------------
create table loyalty_cards (
  id            serial primary key,
  location_id   integer not null references customer_locations (location_id),
  phone         text not null,
  stamps_count  integer not null default 0,
  last_stamp_at timestamptz,
  unique (location_id, phone)
);

-- ----------------------------------------------------------------
-- LOYALTY OTP
-- ----------------------------------------------------------------
create table loyalty_otp (
  location_id integer not null references customer_locations (location_id),
  phone       text not null,
  otp_code    varchar(4) not null,
  expires_at  timestamptz not null,
  primary key (location_id, phone)
);

-- ----------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

create trigger plates_updated_at
  before update on plates
  for each row execute function set_updated_at();

create trigger customer_locations_updated_at
  before update on customer_locations
  for each row execute function set_updated_at();

create trigger reviews_updated_at
  before update on reviews
  for each row execute function set_updated_at();
