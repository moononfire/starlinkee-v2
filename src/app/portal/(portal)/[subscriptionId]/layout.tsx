import { notFound, redirect } from "next/navigation";
import Link from "next/link";
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
      {sub.location && (
        sub.location.logo_link ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sub.location.logo_link}
            alt={sub.location.location_name}
            className={`h-14 w-14 object-cover border border-gray-200 dark:border-gray-700 ${
              sub.location.logo_is_round ? "rounded-full" : "rounded-xl"
            }`}
          />
        ) : (
          <Link
            href={`/portal/${subscriptionId}?scrollTo=logo`}
            className="flex flex-col items-center gap-1 w-fit"
          >
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap">
              &lt;{t("portal_no_logo", lang)}&gt;
            </span>
            <span className="h-14 w-14 rounded-full border-2 border-dashed border-amber-400 dark:border-amber-600 flex items-center justify-center text-amber-500 text-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors">
              ?
            </span>
          </Link>
        )
      )}
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
          hasPromo={sub.status === "active"}
          hasLoyalty={sub.status === "active"}
          hasLinktree={sub.status === "active" && !!sub.location?.has_linktree_access}
          unreadMessageCount={unreadMessageCount}
          lang={lang}
        />
      )}

      {children}
    </div>
  );
}
