import { cookies } from "next/headers";

export const SUPPORTED_LANGUAGES = ["en", "de", "pl"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export async function getLanguage(scopeKey?: string, fallback: string = "en"): Promise<Language> {
  const jar = await cookies();
  const cookieName = scopeKey ? `lang_${scopeKey}` : "lang";
  const cookie = jar.get(cookieName)?.value;
  if (cookie && SUPPORTED_LANGUAGES.includes(cookie as Language)) {
    return cookie as Language;
  }
  if (SUPPORTED_LANGUAGES.includes(fallback as Language)) {
    return fallback as Language;
  }
  return "en";
}
