import type { CustomerLocation, CustomerLocationLink } from "./types";

export type PromoField = "promo_description" | "promo_banner_text" | "promo_sms_text";

export function getPromoText(location: CustomerLocation, lang: string, field: PromoField): string {
  return getModuleText(location, lang, field);
}

export function getModuleText(location: CustomerLocation, lang: string, field: string): string {
  const pl = location[field as keyof CustomerLocation] as string | null ?? "";
  const en = location[`${field}_en` as keyof CustomerLocation] as string | null ?? "";
  const de = location[`${field}_de` as keyof CustomerLocation] as string | null ?? "";
  const it = location[`${field}_it` as keyof CustomerLocation] as string | null ?? "";
  if (lang === "it") return it || en || pl || de;
  if (lang === "en") return en || pl || de;
  if (lang === "de") return de || pl || en;
  return pl || en || de;
}

// Fallback order mirrors getModuleText: it -> en -> pl -> de; for en/de/pl the order is unchanged.
export function getLinkTitle(link: CustomerLocationLink, lang: string): string {
  if (lang === "it") return link.title_it || link.title_en || link.title_pl || link.title_de || link.title;
  if (lang === "pl") return link.title_pl || link.title_en || link.title_de || link.title;
  if (lang === "en") return link.title_en || link.title_pl || link.title_de || link.title;
  if (lang === "de") return link.title_de || link.title_pl || link.title_en || link.title;
  return link.title;
}
