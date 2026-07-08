import type { CustomerLocation } from "./types";

export type PromoField = "promo_description" | "promo_banner_text" | "promo_sms_text";

export function getPromoText(location: CustomerLocation, lang: string, field: PromoField): string {
  const pl = location[field] ?? "";
  const en = location[`${field}_en` as keyof CustomerLocation] as string | null ?? "";
  const de = location[`${field}_de` as keyof CustomerLocation] as string | null ?? "";
  if (lang === "en") return en || pl || de;
  if (lang === "de") return de || pl || en;
  return pl || en || de;
}
