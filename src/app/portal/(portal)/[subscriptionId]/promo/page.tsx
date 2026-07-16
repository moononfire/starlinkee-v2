import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getLeadsByLocationId } from "@/lib/db/leads";
import { updatePromoSettings, updatePromoEnabled } from "./actions";
import PromoPreviewEditor from "./PromoPreviewEditor";
import PromoContactsTable from "./PromoContactsTable";
import SavableForm from "../../SavableForm";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import {
  AutoSaveToggle,
  AutoSavePendingHint,
} from "../../settings/AutoSaveControls";

interface Props {
  params: Promise<{ subscriptionId: string }>;
}

export default async function PromoPortalPage({ params }: Props) {
  const { subscriptionId: rawId } = await params;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  if (!sub.location) {
    redirect(`/portal/${subscriptionId}`);
  }

  const lang = await getLanguage();
  const location = sub.location;
  const leads = await getLeadsByLocationId(location.location_id);
  const locationName = location.location_name;

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <SavableForm action={updatePromoEnabled} lang={lang}>
          <input type="hidden" name="subscription_id" value={subscriptionId} />
          <input type="hidden" name="location_id" value={location.location_id} />
          <label className="flex items-start gap-3 cursor-pointer">
            <AutoSaveToggle
              name="has_promo_enabled"
              defaultChecked={location.has_promo_enabled}
              ariaLabel={t("portal_promo_enabled_title", lang)}
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t("portal_promo_enabled_title", lang)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("portal_promo_enabled_desc", lang)}
              </p>
            </div>
          </label>
          <div className="mt-2">
            <AutoSavePendingHint lang={lang} />
          </div>
        </SavableForm>
      </section>

      <div className={location.has_promo_enabled ? undefined : "opacity-50 pointer-events-none select-none"}>
        <SavableForm action={updatePromoSettings} lang={lang}>
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
        </SavableForm>

        <PromoContactsTable leads={leads} lang={lang} />
      </div>
    </div>
  );
}
