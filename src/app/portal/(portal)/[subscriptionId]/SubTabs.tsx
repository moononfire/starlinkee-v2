"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/translations";

export default function SubTabs({
  subscriptionId,
  hasPromo,
  lang,
}: {
  subscriptionId: number;
  hasPromo: boolean;
  lang: string;
}) {
  const pathname = usePathname();
  const base = `/portal/${subscriptionId}`;

  const tabs = [
    { href: base, label: t("portal_tab_overview", lang), exact: true },
    { href: `${base}/reviews`, label: t("portal_tab_reviews", lang) },
    ...(hasPromo
      ? [{ href: `${base}/promo`, label: t("portal_tab_promo", lang) }]
      : []),
    { href: `${base}/settings`, label: t("portal_tab_settings", lang) },
  ];

  return (
    <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-medium"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
