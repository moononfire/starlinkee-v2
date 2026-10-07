import { describe, it, expect } from "vitest";
import { plateScanCount } from "@/lib/plate-scans";

describe("plateScanCount()", () => {
  it("adds the offset to the visit counter", () => {
    expect(plateScanCount({ number_of_visits: 5, scan_count_offset: 2 })).toBe(7);
    expect(plateScanCount({ number_of_visits: 5, scan_count_offset: 0 })).toBe(5);
  });

  it("treats missing or null fields as 0", () => {
    expect(plateScanCount({})).toBe(0);
    expect(plateScanCount({ number_of_visits: null, scan_count_offset: null })).toBe(0);
  });
});
