import { PLATE_LANGUAGES, type PlateLanguage } from "./languages";

// Polish text lives in the unsuffixed column, every other language in `<base>_<lang>`.
export function localizedFieldName(base: string, lang: PlateLanguage): string {
  return lang === "pl" ? base : `${base}_${lang}`;
}

// A language editor shows one language at a time; the others must still be submitted
// (as hidden inputs), otherwise saving from one tab would clear the other languages.
export function hiddenLanguageFields(
  base: string,
  values: Record<PlateLanguage, string>,
  active: PlateLanguage
): { name: string; value: string }[] {
  return PLATE_LANGUAGES.filter((l) => l !== active).map((l) => ({
    name: localizedFieldName(base, l),
    value: values[l] ?? "",
  }));
}
