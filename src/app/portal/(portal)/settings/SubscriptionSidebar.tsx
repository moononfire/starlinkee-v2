"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/translations";

export interface SidebarSubscription {
  subscription_id: number;
  subscription_name: string;
  status: "pending" | "active" | "inactive";
  locationName: string | null;
}

function StatusBadge({ status, lang }: { status: SidebarSubscription["status"]; lang: string }) {
  if (status === "active") return null;
  if (status === "pending")
    return (
      <span className="ml-auto shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
        {t("portal_status_setup_badge", lang)}
      </span>
    );
  return (
    <span className="ml-auto shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
      {t("portal_status_inactive_badge", lang)}
    </span>
  );
}

export default function SubscriptionSidebar({
  subscriptions,
  lang,
}: {
  subscriptions: SidebarSubscription[];
  lang: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
        {t("portal_your_locations", lang)}
      </p>
      {subscriptions.map((sub) => {
        const href = `/portal/${sub.subscription_id}`;
        const isActive = pathname === href;
        const label = sub.locationName ?? t("portal_unassigned_subscription", lang);

        return (
          <Link
            key={sub.subscription_id}
            href={href}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <span className="truncate">{label}</span>
            <StatusBadge status={sub.status} lang={lang} />
          </Link>
        );
      })}
    </nav>
  );
}
