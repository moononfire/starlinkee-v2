import { describe, it, expect } from "vitest";
import { normalizeEmail, escapeLikePattern } from "./customer-email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Jan@Firma.PL\n")).toBe("jan@firma.pl");
  });
});

describe("escapeLikePattern", () => {
  it("escapes %, _ and backslash and leaves the rest", () => {
    expect(escapeLikePattern("a_b%c\\d@x.com")).toBe("a\\_b\\%c\\\\d@x.com");
  });
});
