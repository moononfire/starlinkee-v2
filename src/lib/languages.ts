// UI language of the owner portal (switcher, /verify, getLanguage() without arguments).
export const SUPPORTED_LANGUAGES = ["en", "de", "pl"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// Everything an end customer sees: plate screens, /l/* pages and per-language content stored in the DB.
export const PLATE_LANGUAGES = [...SUPPORTED_LANGUAGES, "it"] as const;
export type PlateLanguage = (typeof PLATE_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

// A location without any plate yet has no plate language of its own: fall back to the default.
export function firstPlateLanguage(plates: readonly { plate_language: string }[]): string {
  return plates[0]?.plate_language ?? DEFAULT_LANGUAGE;
}
