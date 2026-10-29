import { describe, it, expect } from "vitest";
import { isPositiveRating } from "./review-rating";

describe("isPositiveRating", () => {
  it("treats 5 as positive regardless of the four-star setting", () => {
    expect(isPositiveRating(5, true)).toBe(true);
    expect(isPositiveRating(5, false)).toBe(true);
  });
  it("treats 4 as positive only when four-star redirect is on", () => {
    expect(isPositiveRating(4, true)).toBe(true);
    expect(isPositiveRating(4, false)).toBe(false);
  });
  it("treats 1-3 as negative", () => {
    for (const r of [1, 2, 3]) expect(isPositiveRating(r, true)).toBe(false);
  });
});
