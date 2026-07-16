export function FlagPL({ className = "w-6 h-[18px] rounded-sm shadow-sm" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className}>
      <rect width="32" height="12" fill="#fff" />
      <rect y="12" width="32" height="12" fill="#dc143c" />
    </svg>
  );
}

export function FlagDE({ className = "w-6 h-[18px] rounded-sm shadow-sm" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className}>
      <rect width="32" height="8" fill="#000" />
      <rect y="8" width="32" height="8" fill="#dd0000" />
      <rect y="16" width="32" height="8" fill="#ffcc00" />
    </svg>
  );
}

export function FlagGB({ className = "w-6 h-[18px] rounded-sm shadow-sm" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={className}>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0V30M0 15H60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0V30M0 15H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

const FLAG_MAP: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  en: FlagGB,
  de: FlagDE,
  pl: FlagPL,
};

export function LanguageFlag({ lang, className }: { lang: string; className?: string }) {
  const Flag = FLAG_MAP[lang];
  if (!Flag) return null;
  return <Flag className={className} />;
}
