import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getUnreadThreadCountBySubscriptionId } from "@/lib/db/review-messages";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import SubTabs from "./SubTabs";

export default async function SubscriptionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subscriptionId: string }>;
}) {
  const { subscriptionId: rawId } = await params;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  const lang = await getLanguage();
  const unreadMessageCount =
    sub.status === "active" ? await getUnreadThreadCountBySubscriptionId(subscriptionId) : 0;

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    inactive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const statusLabel: Record<string, string> = {
    active: t("portal_status_active", lang),
    pending: t("portal_status_pending", lang),
    inactive: t("portal_status_inactive_badge", lang),
  };

  const title =
    sub.location?.location_name ??
    (sub.plates.length > 0
      ? sub.plates.map((p) => p.plate_number).join(", ")
      : t("portal_unassigned", lang));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
          {title}
        </h2>
        <span
          className={`shrink-0 inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
            statusColors[sub.status] ?? statusColors.inactive
          }`}
        >
          {statusLabel[sub.status] ?? sub.status}
        </span>
      </div>

      {sub.status !== "pending" && (
        <SubTabs
          subscriptionId={subscriptionId}
          hasPromo={sub.status === "active" && !!sub.location?.has_promo_enabled}
          hasLoyalty={sub.status === "active" && !!sub.location?.has_loyalty_enabled}
          unreadMessageCount={unreadMessageCount}
          lang={lang}
        />
      )}

      {children}
    </div>
  );
}
