"use client";

import { useTheme } from "@/components/ThemeProvider";
import { t } from "@/lib/translations";

export default function ThemeSettings({ lang }: { lang: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          theme === "light"
            ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
      >
        <span className="text-base leading-none">☀️</span>
        {t("portal_theme_light", lang)}
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          theme === "dark"
            ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
      >
        <span className="text-base leading-none">🌙</span>
        {t("portal_theme_dark", lang)}
      </button>
    </div>
  );
}
