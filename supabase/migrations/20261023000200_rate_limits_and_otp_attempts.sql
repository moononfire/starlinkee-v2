-- Persistent rate limiting (Vercel instances do not share memory) and
-- brute-force protection for the loyalty SMS code.

create table if not exists rate_limits (
  key          text primary key,
  count        integer not null,
  window_start timestamptz not null default now()
);
-- Server-only table (service_role bypasses RLS).
alter table rate_limits enable row level security;

-- Atomically registers one hit for `p_key` in a fixed window and returns
-- whether it is still within `p_limit`.
create or replace function rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
as $$
declare
  v_count integer;
begin
  insert into rate_limits as r (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    count = case
      when r.window_start <= now() - make_interval(secs => p_window_seconds) then 1
      else r.count + 1
    end,
    window_start = case
      when r.window_start <= now() - make_interval(secs => p_window_seconds) then now()
      else r.window_start
    end
  returning r.count into v_count;

  return v_count <= p_limit;
end;
$$;

create or replace function rate_limit_cleanup()
returns void
language sql
as $$
  delete from rate_limits where window_start < now() - interval '1 day';
$$;

alter table loyalty_otp add column if not exists attempts integer not null default 0;

-- Counts one verification attempt for the phone's current code and deletes
-- the code once more than `p_max` attempts were made. Returns the attempt
-- number, or 0 when there is no code.
create or replace function loyalty_otp_attempt(p_phone text, p_max integer)
returns integer
language plpgsql
as $$
declare
  v_attempts integer;
begin
  update loyalty_otp set attempts = attempts + 1
  where phone = p_phone
  returning attempts into v_attempts;

  if v_attempts is null then
    return 0;
  end if;
  if v_attempts > p_max then
    delete from loyalty_otp where phone = p_phone;
  end if;
  return v_attempts;
end;
$$;

-- These are server-side helpers: never callable through the public API.
revoke all on function rate_limit_hit(text, integer, integer) from public, anon, authenticated;
revoke all on function rate_limit_cleanup() from public, anon, authenticated;
revoke all on function loyalty_otp_attempt(text, integer) from public, anon, authenticated;
grant execute on function rate_limit_hit(text, integer, integer) to service_role;
grant execute on function rate_limit_cleanup() to service_role;
grant execute on function loyalty_otp_attempt(text, integer) to service_role;

-- C8: the visit counters must not be callable by anonymous API clients.
revoke execute on function increment_plate_visits(integer) from public, anon, authenticated;
revoke execute on function increment_linktree_visits(integer) from public, anon, authenticated;
grant execute on function increment_plate_visits(integer) to service_role;
grant execute on function increment_linktree_visits(integer) to service_role;
