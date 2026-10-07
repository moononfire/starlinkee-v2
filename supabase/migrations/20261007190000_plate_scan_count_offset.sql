-- Scan history before per-scan counting is only known as a lower bound:
-- the number of reviews rows. Freeze the gap (if any) once so that
-- displayed scans = number_of_visits + scan_count_offset >= historical reviews,
-- and every new scan still adds exactly +1. Revert: alter table plates drop column scan_count_offset;
alter table plates add column scan_count_offset integer not null default 0;
update plates p
  set scan_count_offset = greatest(0, (select count(*) from reviews r where r.plate_id = p.plate_id) - p.number_of_visits);
