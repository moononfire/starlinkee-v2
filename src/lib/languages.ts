// Every language of the product: owner portal (switcher, /verify, getLanguage() without arguments),
// e-mails, plate screens, /l/* pages and per-language content stored in the DB.
export const SUPPORTED_LANGUAGES = ["en", "de", "pl", "it"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// What an end customer (guest) sees; the same set as the owner's, kept as a separate name for readability.
export const PLATE_LANGUAGES = SUPPORTED_LANGUAGES;
export type PlateLanguage = Language;

export const DEFAULT_LANGUAGE: Language = "en";

// A location without any plate yet has no plate language of its own: fall back to the default.
export function firstPlateLanguage(plates: readonly { plate_language: string }[]): string {
  return plates[0]?.plate_language ?? DEFAULT_LANGUAGE;
}

const isOwnerLanguage = (l: unknown): l is Language => SUPPORTED_LANGUAGES.includes(l as Language);
const isPlateLanguage = (l: unknown): l is PlateLanguage => PLATE_LANGUAGES.includes(l as PlateLanguage);

/**
 * Language for anything the OWNER sees or receives (portal, emails to the owner or venue,
 * Stripe checkout): the customer's preferred language, else the plate's language, else English.
 */
export function ownerLanguage(
  customer?: { preferred_language?: string | null } | null,
  plate?: { plate_language?: string | null } | null
): Language {
  if (isOwnerLanguage(customer?.preferred_language)) return customer.preferred_language;
  if (isOwnerLanguage(plate?.plate_language)) return plate.plate_language;
  return DEFAULT_LANGUAGE;
}

/**
 * Language for anything a GUEST sees or receives (plate screens, emails to the reporter):
 * the guest's own choice (cookie) if valid, else the plate's language, else English.
 * Never the owner's language.
 */
export function guestLanguage(
  guestChoice?: string | null,
  plate?: { plate_language?: string | null } | null
): PlateLanguage {
  if (isPlateLanguage(guestChoice)) return guestChoice;
  if (isPlateLanguage(plate?.plate_language)) return plate.plate_language;
  return DEFAULT_LANGUAGE;
}

/** Billing country → owner language, used only when nothing better is known (Stripe signups). */
export function languageFromCountry(country?: string | null): Language {
  return country === "DE" ? "de" : country === "PL" ? "pl" : country === "IT" ? "it" : DEFAULT_LANGUAGE;
}
