import { cookies } from "next/headers";

export const SUPPORTED_LANGUAGES = ["en", "de", "pl"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export async function getLanguage(
  scopeKey?: string,
  fallback: string = "en",
  allowedLanguages: readonly string[] = SUPPORTED_LANGUAGES
): Promise<Language> {
  const jar = await cookies();
  const cookieName = scopeKey ? `lang_${scopeKey}` : "lang";
  const cookie = jar.get(cookieName)?.value;
  if (cookie && allowedLanguages.includes(cookie) && SUPPORTED_LANGUAGES.includes(cookie as Language)) {
    return cookie as Language;
  }
  if (allowedLanguages.includes(fallback) && SUPPORTED_LANGUAGES.includes(fallback as Language)) {
    return fallback as Language;
  }
  const firstAllowed = allowedLanguages.find((l) => SUPPORTED_LANGUAGES.includes(l as Language));
  return (firstAllowed as Language) ?? "en";
}
