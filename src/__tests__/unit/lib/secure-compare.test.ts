import { describe, it, expect } from "vitest";
import { safeEqual } from "@/lib/secure-compare";

describe("safeEqual()", () => {
  it("compares equal and different strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(safeEqual(null, "abc")).toBe(false);
    expect(safeEqual("abc", undefined)).toBe(false);
    expect(safeEqual(new File([], "x"), "abc")).toBe(false);
  });
});
