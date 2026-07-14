"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}>({ theme: "light", toggle: () => {}, setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

// Customer-facing pages (scanned by end users on their own devices) are
// always designed light regardless of the visitor's OS theme — only the
// admin dashboard supports a dark mode toggle.
function isPublicCustomerRoute(pathname: string | null): boolean {
  return !!pathname && (pathname.startsWith("/l/") || pathname.startsWith("/plate/"));
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const forceLight = isPublicCustomerRoute(pathname);
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (forceLight) {
      document.documentElement.classList.remove("dark");
      setTheme("light");
      setMounted(true);
      return;
    }
    const stored = localStorage.getItem("theme") as Theme | null;
    const initial =
      stored ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    setMounted(true);
  }, [forceLight]);

  useEffect(() => {
    if (!mounted || forceLight) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme, mounted, forceLight]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
