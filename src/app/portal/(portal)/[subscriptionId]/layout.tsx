import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalSession } from "@/lib/portal-session";
import { getUnreadThreadCountBySubscriptionId } from "@/lib/db/review-messages";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import SubTabs from "./SubTabs";
import SidebarLogoPlaceholder from "./SidebarLogoPlaceholder";
import LocationSwitcherDropdown from "./LocationSwitcherDropdown";

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

  const sidebarSubs = subscriptions.map((s) => ({
    subscription_id: s.subscription_id,
    locationName: s.location?.location_name ?? null,
  }));

  return (
    <div className="flex flex-col lg:flex-row flex-1 h-full w-full">
      {/* Left Sidebar */}
      <aside className="lg:w-64 shrink-0 flex flex-col gap-5 lg:border-r lg:border-gray-200 lg:dark:border-gray-700 px-4 sm:px-6 lg:px-6 py-4 lg:py-6 bg-white dark:bg-gray-800 lg:bg-transparent lg:dark:bg-transparent border-b border-gray-200 dark:border-gray-700 lg:border-b-0">
        {/* Dropdown for locations */}
        {subscriptions.length > 1 && (
          <LocationSwitcherDropdown 
            currentSubscriptionId={subscriptionId} 
            subscriptions={sidebarSubs} 
            lang={lang} 
          />
        )}
        
        {/* Logo and Name */}
        <div className="flex items-center gap-3">
          {sub.location && (
            sub.location.logo_link ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sub.location.logo_link}
                alt={sub.location.location_name}
                className={`h-12 w-12 object-cover border border-gray-200 dark:border-gray-700 ${
                  sub.location.logo_is_round ? "rounded-full" : "rounded-xl"
                }`}
              />
            ) : (
              <SidebarLogoPlaceholder subscriptionId={subscriptionId} lang={lang} />
            )
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h2>
            <span
              className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium leading-none ${
                statusColors[sub.status] ?? statusColors.inactive
              }`}
            >
              {statusLabel[sub.status] ?? sub.status}
            </span>
          </div>
        </div>

        {/* Tabs */}
        {sub.status !== "pending" && (
          <div className="pt-2 lg:pt-4">
            <SubTabs
              subscriptionId={subscriptionId}
              hasPromo={sub.status === "active"}
              hasLoyalty={sub.status === "active"}
              hasLinktree={sub.status === "active" && !!sub.location?.has_linktree_access}
              unreadMessageCount={unreadMessageCount}
              lang={lang}
            />
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full">
        {children}
      </main>
    </div>
  );
}
