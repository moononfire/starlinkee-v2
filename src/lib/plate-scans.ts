// Displayed scan count for a plate: per-scan counter plus the frozen
// pre-tracking lower bound (see migration *_plate_scan_count_offset.sql).
export function plateScanCount(p: {
  number_of_visits?: number | null;
  scan_count_offset?: number | null;
}): number {
  return (p.number_of_visits ?? 0) + (p.scan_count_offset ?? 0);
}
