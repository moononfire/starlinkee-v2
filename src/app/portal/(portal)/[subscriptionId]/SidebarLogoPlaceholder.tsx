"use client";

import { useRouter } from "next/navigation";
import { t } from "@/lib/translations";

interface Props {
  subscriptionId: number;
  lang: string;
}

export default function SidebarLogoPlaceholder({ subscriptionId, lang }: Props) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/portal/${subscriptionId}?scrollTo=logo&t=${Date.now()}`)}
      className="flex flex-col items-center gap-1 w-fit group relative cursor-pointer"
    >
      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 group-hover:underline whitespace-nowrap transition-all">
        &lt;{t("portal_no_logo", lang)}&gt;
      </span>
      <span className="h-14 w-14 rounded-full border-2 border-dashed border-amber-400 dark:border-amber-600 flex items-center justify-center text-amber-500 text-lg group-hover:bg-amber-50 dark:group-hover:bg-amber-950/30 transition-colors">
        ?
      </span>

      {/* Tooltip */}
      <div className="absolute top-full mt-2 w-48 p-2.5 bg-gray-900 dark:bg-gray-700 text-white text-[11px] font-medium text-center rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none left-1/2 -translate-x-1/2">
        Dodaj logo swojego lokalu, aby klienci widzieli je po zeskanowaniu płytki.
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
      </div>
    </div>
  );
}
