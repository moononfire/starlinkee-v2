import type { CustomerLocation, CustomerLocationLink } from "./types";

export type PromoField = "promo_description" | "promo_banner_text" | "promo_sms_text";

export function getPromoText(location: CustomerLocation, lang: string, field: PromoField): string {
  return getModuleText(location, lang, field);
}

// Venue content a guest cannot read in their own language: English next, then Polish (the column without a
// suffix, the original), then German. Italian is only shown to Italian guests, as before.
const FALLBACK_ORDER = ["en", "pl", "de"] as const;
const languageOrder = (lang: string): string[] => [...new Set([lang, ...FALLBACK_ORDER])];

export function getModuleText(location: CustomerLocation, lang: string, field: string): string {
  const column = (l: string) =>
    (location[(l === "pl" ? field : `${field}_${l}`) as keyof CustomerLocation] as string | null) ?? "";
  for (const l of languageOrder(lang)) {
    const text = column(l);
    if (text) return text;
  }
  return "";
}

// Same order as getModuleText, ending with the base title.
export function getLinkTitle(link: CustomerLocationLink, lang: string): string {
  const titles = link as unknown as Record<string, string | null | undefined>;
  for (const l of languageOrder(lang)) {
    const title = titles[`title_${l}`];
    if (title) return title;
  }
  return link.title;
}
