import translationsJson from "./translations.json";

type Language = "en" | "de" | "pl";
type Translations = Record<string, Record<string, string>>;

const translations = translationsJson as Translations;

export function t(key: string, language: string = "en"): string {
  const lang = (["en", "de", "pl"].includes(language) ? language : "en") as Language;
  return translations[lang]?.[key] ?? translations["en"]?.[key] ?? key;
}
