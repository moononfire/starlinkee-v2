"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/translations";

export default function SubTabs({
  subscriptionId,
  hasPromo,
  hasLoyalty,
  hasLinktree,
  unreadMessageCount = 0,
  lang,
}: {
  subscriptionId: number;
  hasPromo: boolean;
  hasLoyalty: boolean;
  hasLinktree: boolean;
  unreadMessageCount?: number;
  lang: string;
}) {
  const pathname = usePathname();
  const base = `/portal/${subscriptionId}`;

  const tabs = [
    { href: base, label: t("portal_tab_overview", lang), exact: true },
    { href: `${base}/analytics`, label: t("portal_tab_analytics", lang) },
    { href: `${base}/reviews`, label: t("portal_tab_reviews", lang), badge: unreadMessageCount },
    ...(hasPromo
      ? [{ href: `${base}/promo`, label: t("portal_tab_promo", lang) }]
      : []),
    ...(hasLoyalty
      ? [{ href: `${base}/loyalty`, label: t("portal_tab_loyalty", lang) }]
      : []),
    ...(hasLinktree
      ? [{ href: `${base}/linktree`, label: t("portal_tab_linktree", lang) }]
      : []),
    { href: `${base}/menu`, label: t("portal_tab_menu", lang) },
    { href: `${base}/wifi`, label: t("portal_tab_wifi", lang) },
    { href: `${base}/settings`, label: t("portal_tab_settings", lang) },
  ];

  return (
    <nav className="flex flex-row lg:flex-col gap-1 lg:gap-1.5 overflow-x-auto lg:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-2 lg:pb-0 border-b border-gray-200 dark:border-gray-700 lg:border-none">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
              isActive
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            <span>{tab.label}</span>
            {"badge" in tab && tab.badge ? (
              <span className="ml-2 inline-flex items-center justify-center bg-blue-600 text-white text-[10px] rounded-full h-4 min-w-[16px] px-1 font-bold">
                {tab.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
