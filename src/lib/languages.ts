// Portal, linktree and DB-backed content (promo, links, banners) — these have per-language columns.
export const SUPPORTED_LANGUAGES = ["en", "de", "pl"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// Plate screens (rating, feedback, thank-you, renewal) additionally speak Italian.
export const PLATE_LANGUAGES = [...SUPPORTED_LANGUAGES, "it"] as const;
export type PlateLanguage = (typeof PLATE_LANGUAGES)[number];

// /l/* pages have no Italian content, so a location's active languages are narrowed
// to the portal-supported ones before choosing a language or rendering the switcher.
export function linktreeLanguages(active: readonly string[]): Language[] {
  return SUPPORTED_LANGUAGES.filter((l) => active.includes(l));
}
