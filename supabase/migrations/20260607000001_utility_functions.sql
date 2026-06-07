create or replace function increment_plate_visits(p_plate_id integer)
returns void language plpgsql as $$
begin
  update plates set number_of_visits = number_of_visits + 1 where plate_id = p_plate_id;
end;
$$;

create or replace function increment_linktree_visits(p_location_id integer)
returns void language plpgsql as $$
begin
  update customer_locations set linktree_visits = linktree_visits + 1 where location_id = p_location_id;
end;
$$;
