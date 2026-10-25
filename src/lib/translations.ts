import translationsJson from "./translations.json";
import { PLATE_LANGUAGES, type PlateLanguage } from "./languages";

type Translations = Record<string, Record<string, string>>;

const translations = translationsJson as Translations;

export function t(key: string, language: string = "en"): string {
  const lang = (PLATE_LANGUAGES.includes(language as PlateLanguage) ? language : "en") as PlateLanguage;
  return translations[lang]?.[key] ?? translations["en"]?.[key] ?? key;
}
