"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/translations";

export default function SavedToast({ show, lang = "en" }: { show: boolean; lang?: string }) {
  const router = useRouter();
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (!show) return;
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("saved");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    }, 3000);
    return () => clearTimeout(timer);
  }, [show, router]);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium px-4 py-3 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      {t("portal_saved_toast", lang)}
    </div>
  );
}
