"use client";

import { useRouter } from "next/navigation";
import { LanguageFlag } from "./flags";

const languages = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
  { code: "pl", label: "PL" },
] as const;

interface Props {
  currentLang: string;
  scopeKey?: string;
  availableLanguages?: readonly string[];
}

export default function LanguageSwitcher({ currentLang, scopeKey, availableLanguages }: Props) {
  const router = useRouter();

  function switchLang(lang: string) {
    const cookieName = scopeKey ? `lang_${scopeKey}` : "lang";
    document.cookie = `${cookieName}=${lang};path=/;max-age=${60 * 60 * 24 * 365};SameSite=None;Secure`;
    router.refresh();
  }

  const visibleLanguages = availableLanguages
    ? languages.filter((l) => availableLanguages.includes(l.code))
    : languages;

  return (
    <div className="flex items-center gap-1.5">
      {visibleLanguages.map(({ code, label }) => {
        const isActive = currentLang === code;
        return (
          <button
            key={code}
            onClick={() => switchLang(code)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              isActive
                ? "bg-gray-100 ring-1 ring-gray-300 text-gray-900"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
            aria-label={`Switch to ${label}`}
          >
            <LanguageFlag lang={code} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
