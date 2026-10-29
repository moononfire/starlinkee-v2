import { cookies } from "next/headers";
import { SUPPORTED_LANGUAGES, PLATE_LANGUAGES, type Language, type PlateLanguage } from "@/lib/languages";

export { SUPPORTED_LANGUAGES, PLATE_LANGUAGES, type Language, type PlateLanguage };

export async function getLanguage(
  scopeKey?: string,
  fallback: string = "en",
  allowedLanguages: readonly string[] = SUPPORTED_LANGUAGES
): Promise<PlateLanguage> {
  const jar = await cookies();
  const cookieName = scopeKey ? `lang_${scopeKey}` : "lang";
  const cookie = jar.get(cookieName)?.value;
  if (cookie && allowedLanguages.includes(cookie) && PLATE_LANGUAGES.includes(cookie as PlateLanguage)) {
    return cookie as PlateLanguage;
  }
  if (allowedLanguages.includes(fallback) && PLATE_LANGUAGES.includes(fallback as PlateLanguage)) {
    return fallback as PlateLanguage;
  }
  // The wanted language isn't offered here: English is the neutral default, not whatever is listed first.
  if (allowedLanguages.includes("en")) return "en";
  const firstAllowed = allowedLanguages.find((l) => PLATE_LANGUAGES.includes(l as PlateLanguage));
  return (firstAllowed as PlateLanguage) ?? "en";
}
