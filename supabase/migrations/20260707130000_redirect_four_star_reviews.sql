-- Let a customer choose whether a 4-star rating also redirects to Google review.
-- 5 stars always redirects; 3 and below never does. Default true preserves
-- current behaviour (rating >= 4 always redirected) for existing locations.
alter table customer_locations
  add column redirect_four_star_reviews boolean not null default true;
