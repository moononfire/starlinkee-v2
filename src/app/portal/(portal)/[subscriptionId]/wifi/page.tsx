import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import WifiSettings from "./WifiSettings";

interface Props {
  params: Promise<{ subscriptionId: string }>;
}

export default async function SubscriptionWifiPage({ params }: Props) {
  const { subscriptionId: rawId } = await params;
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

  if (sub.status === "inactive") {
    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
          {t("portal_data_preserved", lang)}
        </p>
        <div className="opacity-50 pointer-events-none select-none">
          <WifiSettings
            subscriptionId={subscriptionId}
            location={sub.location as any}
            lang={lang}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <WifiSettings
        subscriptionId={subscriptionId}
        location={sub.location as any}
        lang={lang}
      />
    </div>
  );
}
