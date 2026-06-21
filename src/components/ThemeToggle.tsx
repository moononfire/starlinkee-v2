"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label="Przełącz tryb ciemny / jasny"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer select-none"
    >
      <span className="text-lg leading-none">
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
      <span>{theme === "dark" ? "Jasny" : "Ciemny"}</span>
    </button>
  );
}
