-- Google Sign-In in the mobile app isn't an enforced identity (phone/SMS OTP
-- is), but we still want to keep the Google email on file for potential
-- future contact/support use — linked to the phone number, since phone is
-- the one thing that actually identifies a loyalty account. A phone can
-- accumulate multiple emails if the same person later signs in with a
-- different Google account. Nothing reads this table yet.
create table loyalty_account_emails (
  phone      text not null,
  email      text not null,
  created_at timestamptz not null default now(),
  primary key (phone, email)
);
