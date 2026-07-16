import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getLocationLinksByLocationId, ensureLinktreeSlug } from "@/lib/db/locations";
import type { CustomerLocationLink } from "@/lib/types";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import LinktreeSettings from "./LinktreeSettings";

interface Props {
  params: Promise<{ subscriptionId: string }>;
}

export default async function SubscriptionLinktreePage({ params }: Props) {
  const { subscriptionId: rawId } = await params;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  if (sub.status === "pending" || !sub.location || !sub.location.has_linktree_access) {
    redirect(`/portal/${subscriptionId}`);
  }

  const lang = await getLanguage();

  const [locationLinks, ensuredSlug] = await Promise.all([
    getLocationLinksByLocationId(sub.location.location_id),
    sub.location.linktree_slug
      ? Promise.resolve(sub.location.linktree_slug)
      : ensureLinktreeSlug(sub.location.location_id, sub.location.location_name),
  ]);

  sub.location.linktree_slug = ensuredSlug;

  if (sub.status === "inactive") {
    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
          {t("portal_data_preserved", lang)}
        </p>
        <div className="opacity-50 pointer-events-none select-none">
          <LinktreeSettings
            subscriptionId={subscriptionId}
            location={sub.location}
            locationLinks={locationLinks as CustomerLocationLink[]}
            lang={lang}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LinktreeSettings
        subscriptionId={subscriptionId}
        location={sub.location}
        locationLinks={locationLinks as CustomerLocationLink[]}
        lang={lang}
      />
    </div>
  );
}
