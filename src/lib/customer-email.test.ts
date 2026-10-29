import { describe, it, expect } from "vitest";
import { normalizeEmail, escapeLikePattern, pickByEmail } from "./customer-email";

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

describe("escapeLikePattern with PostgREST's '*'", () => {
  it("replaces * (PostgREST turns it into %, unescapable) by the single-char wildcard _", () => {
    expect(escapeLikePattern("*@x.com")).toBe("_@x.com");
  });
});

describe("pickByEmail", () => {
  const rows = [
    { id: 1, email: "Other@x.com" },
    { id: 2, email: "Jan@Firma.pl " },
    { id: 3, email: "jan@firma.pl" },
  ];
  it("returns the first row with the same address ignoring case and spaces", () => {
    expect(pickByEmail(rows, "JAN@firma.PL")?.id).toBe(2);
  });
  it("returns null for no match, null rows or a wildcard look-alike", () => {
    expect(pickByEmail(rows, "*@firma.pl")).toBeNull();
    expect(pickByEmail(null, "a@b.c")).toBeNull();
  });
});
