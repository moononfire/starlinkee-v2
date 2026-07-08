import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getLocationLinksByLocationId, ensureLinktreeSlug } from "@/lib/db/locations";
import type { CustomerLocationLink } from "@/lib/types";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import SavedToast from "../../SavedToast";
import LocationSettings from "./LocationSettings";

interface Props {
  params: Promise<{ subscriptionId: string }>;
  searchParams: Promise<{ saved?: string; linktreeError?: string }>;
}

export default async function SubscriptionSettingsPage({ params, searchParams }: Props) {
  const { subscriptionId: rawId } = await params;
  const { saved, linktreeError } = await searchParams;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  // Przed konfiguracją nie ma jeszcze czego ustawiać.
  if (sub.status === "pending" || !sub.location) {
    redirect(`/portal/${subscriptionId}`);
  }

  const lang = await getLanguage();

  const [locationLinks, ensuredSlug] = await Promise.all([
    sub.location.has_linktree_access
      ? getLocationLinksByLocationId(sub.location.location_id)
      : Promise.resolve<CustomerLocationLink[]>([]),
    sub.location.has_linktree_access && !sub.location.linktree_slug
      ? ensureLinktreeSlug(sub.location.location_id, sub.location.location_name)
      : Promise.resolve(sub.location.linktree_slug ?? null),
  ]);

  if (sub.location.has_linktree_access) {
    sub.location.linktree_slug = ensuredSlug;
  }

  if (sub.status === "inactive") {
    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
          {t("portal_data_preserved", lang)}
        </p>
        <div className="opacity-50 pointer-events-none select-none">
          <LocationSettings
            subscriptionId={subscriptionId}
            location={sub.location}
            locationLinks={locationLinks}
            lang={lang}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SavedToast show={!!saved} lang={lang} />
      <LocationSettings
        subscriptionId={subscriptionId}
        location={sub.location}
        locationLinks={locationLinks}
        linktreeError={linktreeError}
        saved={saved}
        lang={lang}
      />
    </div>
  );
}
