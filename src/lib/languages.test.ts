import { describe, it, expect } from "vitest";
import { ownerLanguage, guestLanguage, languageFromCountry } from "./languages";

describe("ownerLanguage", () => {
  it("uses the customer's preferred language first", () => {
    expect(ownerLanguage({ preferred_language: "de" }, { plate_language: "pl" })).toBe("de");
  });
  it("falls back to the plate language, then English", () => {
    expect(ownerLanguage(null, { plate_language: "pl" })).toBe("pl");
    expect(ownerLanguage({ preferred_language: null }, null)).toBe("en");
  });
  it("never returns Italian (no owner-facing Italian texts)", () => {
    expect(ownerLanguage(null, { plate_language: "it" })).toBe("en");
    expect(ownerLanguage({ preferred_language: "it" }, null)).toBe("en");
  });
});

describe("guestLanguage", () => {
  it("prefers the guest's own choice", () => {
    expect(guestLanguage("it", { plate_language: "de" })).toBe("it");
  });
  it("ignores unknown choices and uses the plate language", () => {
    expect(guestLanguage("xx", { plate_language: "de" })).toBe("de");
    expect(guestLanguage(undefined, { plate_language: "it" })).toBe("it");
  });
  it("falls back to English", () => {
    expect(guestLanguage(null, null)).toBe("en");
  });
});

describe("languageFromCountry", () => {
  it("maps DE and PL, everything else is English", () => {
    expect(languageFromCountry("DE")).toBe("de");
    expect(languageFromCountry("PL")).toBe("pl");
    expect(languageFromCountry("IT")).toBe("en");
    expect(languageFromCountry(undefined)).toBe("en");
  });
});
