import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import SubmitButton from "../../SubmitButton";
import SavableForm from "../../SavableForm";
import { getLoyaltyStatsForLocation } from "@/lib/db/loyalty";
import { updateLoyaltySettings, updateLoyaltyEnabled } from "./actions";
import LoyaltyPreviewEditor from "./LoyaltyPreviewEditor";
import {
  AutoSaveToggle,
  AutoSavePendingHint,
} from "../../settings/AutoSaveControls";

interface Props {
  params: Promise<{ subscriptionId: string }>;
}

export default async function LoyaltyPortalPage({ params }: Props) {
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
  const stats = await getLoyaltyStatsForLocation(location.location_id);

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <SavableForm action={updateLoyaltyEnabled} lang={lang}>
          <input type="hidden" name="subscription_id" value={subscriptionId} />
          <input type="hidden" name="location_id" value={location.location_id} />
          <label className="flex items-start gap-3 cursor-pointer">
            <AutoSaveToggle
              name="has_loyalty_enabled"
              defaultChecked={location.has_loyalty_enabled}
              ariaLabel={t("portal_loyalty_enabled_title", lang)}
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t("portal_loyalty_enabled_title", lang)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("portal_loyalty_enabled_desc", lang)}
              </p>
            </div>
          </label>
          <div className="mt-2">
            <AutoSavePendingHint lang={lang} />
          </div>
        </SavableForm>
      </section>

      <SavableForm
        action={updateLoyaltySettings}
        className={`space-y-4 ${location.has_loyalty_enabled ? "" : "opacity-50 pointer-events-none select-none"}`}
        lang={lang}
      >
        <input type="hidden" name="subscription_id" value={subscriptionId} />
        <input type="hidden" name="location_id" value={location.location_id} />

        <LoyaltyPreviewEditor
          initialCardText={{
            pl: location.loyalty_card_text ?? "",
            en: location.loyalty_card_text_en ?? "",
            de: location.loyalty_card_text_de ?? "",
          }}
          initialRewardText={{
            pl: location.loyalty_reward_text ?? "",
            en: location.loyalty_reward_text_en ?? "",
            de: location.loyalty_reward_text_de ?? "",
          }}
          initialStampsRequired={location.loyalty_stamps_required ?? 10}
          logoLink={location.logo_link}
          locationName={location.location_name}
          activeLanguages={location.active_languages}
          lang={lang}
        />

        <div className="flex justify-end">
          <SubmitButton lang={lang}>{t("portal_save", lang)}</SubmitButton>
        </div>
      </SavableForm>

      {/* Stats Section */}
      {location.has_loyalty_enabled && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5 mt-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t("portal_loyalty_stats_title", lang)}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("portal_loyalty_total_users", lang)}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUsers}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("portal_loyalty_total_stamps", lang)}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalStamps}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
