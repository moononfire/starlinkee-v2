"use client";

import { useRouter } from "next/navigation";

const languages = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
  { code: "pl", label: "PL" },
] as const;

function FlagPL() {
  return (
    <svg viewBox="0 0 32 24" className="w-6 h-[18px] rounded-sm shadow-sm">
      <rect width="32" height="12" fill="#fff" />
      <rect y="12" width="32" height="12" fill="#dc143c" />
    </svg>
  );
}

function FlagDE() {
  return (
    <svg viewBox="0 0 32 24" className="w-6 h-[18px] rounded-sm shadow-sm">
      <rect width="32" height="8" fill="#000" />
      <rect y="8" width="32" height="8" fill="#dd0000" />
      <rect y="16" width="32" height="8" fill="#ffcc00" />
    </svg>
  );
}

function FlagGB() {
  return (
    <svg viewBox="0 0 60 30" className="w-6 h-[18px] rounded-sm shadow-sm">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0V30M0 15H60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0V30M0 15H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

const flagMap: Record<string, () => React.JSX.Element> = {
  en: FlagGB,
  de: FlagDE,
  pl: FlagPL,
};

interface Props {
  currentLang: string;
  scopeKey?: string;
  availableLanguages?: readonly string[];
}

export default function LanguageSwitcher({ currentLang, scopeKey, availableLanguages }: Props) {
  const router = useRouter();

  function switchLang(lang: string) {
    const cookieName = scopeKey ? `lang_${scopeKey}` : "lang";
    document.cookie = `${cookieName}=${lang};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    router.refresh();
  }

  const visibleLanguages = availableLanguages
    ? languages.filter((l) => availableLanguages.includes(l.code))
    : languages;

  return (
    <div className="flex items-center gap-1.5">
      {visibleLanguages.map(({ code, label }) => {
        const Flag = flagMap[code];
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
            <Flag />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
