import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getLeadsByLocationId } from "@/lib/db/leads";
import { updatePromoSettings } from "./actions";
import PromoPreviewEditor from "./PromoPreviewEditor";
import PromoContactsTable from "./PromoContactsTable";
import SavedToast from "../../SavedToast";
import { getLanguage } from "@/lib/language";

interface Props {
  params: Promise<{ subscriptionId: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function PromoPortalPage({ params, searchParams }: Props) {
  const { subscriptionId: rawId } = await params;
  const { saved } = await searchParams;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  if (!sub.location?.has_promo_enabled) {
    redirect(`/portal/${subscriptionId}`);
  }

  const lang = await getLanguage();
  const location = sub.location;
  const leads = await getLeadsByLocationId(location.location_id);
  const locationName = location.location_name;

  return (
    <div className="space-y-6">
      <form action={updatePromoSettings}>
        <input type="hidden" name="subscription_id" value={subscriptionId} />
        <input type="hidden" name="location_id" value={location.location_id} />
        <PromoPreviewEditor
          initialDescription={{
            pl: location.promo_description ?? "",
            en: location.promo_description_en ?? "",
            de: location.promo_description_de ?? "",
          }}
          initialBannerText={{
            pl: location.promo_banner_text ?? "",
            en: location.promo_banner_text_en ?? "",
            de: location.promo_banner_text_de ?? "",
          }}
          initialSmsText={{
            pl: location.promo_sms_text ?? "",
            en: location.promo_sms_text_en ?? "",
            de: location.promo_sms_text_de ?? "",
          }}
          logoLink={location.logo_link}
          locationName={locationName}
          activeLanguages={location.active_languages}
          lang={lang}
        />
      </form>

      <PromoContactsTable leads={leads} lang={lang} />

      <SavedToast show={saved === "1"} lang={lang} />
    </div>
  );
}
