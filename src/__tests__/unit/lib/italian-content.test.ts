import { describe, it, expect } from "vitest";
import { getModuleText, getLinkTitle } from "@/lib/promo-i18n";
import { hiddenLanguageFields, localizedFieldName } from "@/lib/localized-fields";
import type { CustomerLocation, CustomerLocationLink } from "@/lib/types";

function loc(fields: Record<string, string | null>) {
  return fields as unknown as CustomerLocation;
}

describe("getModuleText", () => {
  const all = loc({ promo_banner_text: "PL", promo_banner_text_en: "EN", promo_banner_text_de: "DE", promo_banner_text_it: "IT" });

  it("returns the Italian text for it", () => {
    expect(getModuleText(all, "it", "promo_banner_text")).toBe("IT");
  });
  it("falls back it -> en -> pl -> de", () => {
    expect(getModuleText(loc({ promo_banner_text: "PL", promo_banner_text_en: "EN", promo_banner_text_de: "DE" }), "it", "promo_banner_text")).toBe("EN");
    expect(getModuleText(loc({ promo_banner_text: "PL", promo_banner_text_de: "DE" }), "it", "promo_banner_text")).toBe("PL");
    expect(getModuleText(loc({ promo_banner_text_de: "DE" }), "it", "promo_banner_text")).toBe("DE");
    expect(getModuleText(loc({}), "it", "promo_banner_text")).toBe("");
  });
  it("keeps the order for en/de/pl (regression)", () => {
    const noIt = loc({ promo_banner_text: "PL", promo_banner_text_en: "EN", promo_banner_text_de: "DE" });
    expect(getModuleText(noIt, "en", "promo_banner_text")).toBe("EN");
    expect(getModuleText(noIt, "de", "promo_banner_text")).toBe("DE");
    expect(getModuleText(noIt, "pl", "promo_banner_text")).toBe("PL");
    expect(getModuleText(loc({ promo_banner_text: "PL", promo_banner_text_de: "DE" }), "en", "promo_banner_text")).toBe("PL");
    expect(getModuleText(loc({ promo_banner_text_en: "EN", promo_banner_text_de: "DE" }), "pl", "promo_banner_text")).toBe("EN");
    expect(getModuleText(all, "en", "promo_banner_text")).toBe("EN");
  });
});

describe("getLinkTitle", () => {
  const link = (f: Partial<CustomerLocationLink>) => ({ title: "base", ...f }) as CustomerLocationLink;

  it("prefers the Italian title and falls back it -> en -> pl -> de -> title", () => {
    expect(getLinkTitle(link({ title_it: "IT", title_en: "EN" }), "it")).toBe("IT");
    expect(getLinkTitle(link({ title_en: "EN", title_pl: "PL" }), "it")).toBe("EN");
    expect(getLinkTitle(link({ title_pl: "PL", title_de: "DE" }), "it")).toBe("PL");
    expect(getLinkTitle(link({ title_de: "DE" }), "it")).toBe("DE");
    expect(getLinkTitle(link({}), "it")).toBe("base");
  });
  it("is unchanged for the other languages", () => {
    const l = link({ title_it: "IT", title_pl: "PL", title_en: "EN", title_de: "DE" });
    expect(getLinkTitle(l, "pl")).toBe("PL");
    expect(getLinkTitle(l, "en")).toBe("EN");
    expect(getLinkTitle(l, "de")).toBe("DE");
    expect(getLinkTitle(link({ title_it: "IT" }), "en")).toBe("base");
  });
});

describe("language editor hidden inputs", () => {
  const values = { pl: "p", en: "e", de: "d", it: "i" };

  it("submits the Italian value when another language tab is open", () => {
    for (const active of ["pl", "en", "de"] as const) {
      expect(hiddenLanguageFields("promo_banner_text", values, active)).toContainEqual({ name: "promo_banner_text_it", value: "i" });
    }
  });
  it("does not duplicate the visible language", () => {
    const names = hiddenLanguageFields("promo_banner_text", values, "it").map((f) => f.name);
    expect(names).toEqual(["promo_banner_text_en", "promo_banner_text_de", "promo_banner_text"]);
  });
  it("names the Polish column without a suffix", () => {
    expect(localizedFieldName("loyalty_card_text", "pl")).toBe("loyalty_card_text");
    expect(localizedFieldName("loyalty_card_text", "it")).toBe("loyalty_card_text_it");
  });
});
