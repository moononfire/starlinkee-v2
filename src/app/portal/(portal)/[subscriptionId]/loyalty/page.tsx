import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import SavedToast from "../../SavedToast";
import SubmitButton from "../../SubmitButton";
import { updateLoyaltySettings } from "./actions";

interface Props {
  params: Promise<{ subscriptionId: string }>;
  searchParams: Promise<{ saved?: string }>;
}

const STAMP_OPTIONS = [5, 6, 7, 8, 9, 10];

export default async function LoyaltyPortalPage({ params, searchParams }: Props) {
  const { subscriptionId: rawId } = await params;
  const { saved } = await searchParams;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  if (!sub.location?.has_loyalty_enabled) {
    redirect(`/portal/${subscriptionId}`);
  }

  const lang = await getLanguage();
  const location = sub.location;

  const textFields = [
    { lang: "pl" as const, name: "loyalty_card_text", label: "PL", value: location.loyalty_card_text },
    { lang: "en" as const, name: "loyalty_card_text_en", label: "EN", value: location.loyalty_card_text_en },
    { lang: "de" as const, name: "loyalty_card_text_de", label: "DE", value: location.loyalty_card_text_de },
  ];

  return (
    <div className="space-y-4">
      <SavedToast show={saved === "1"} lang={lang} />

      <form action={updateLoyaltySettings} className="space-y-4">
        <input type="hidden" name="subscription_id" value={subscriptionId} />
        <input type="hidden" name="location_id" value={location.location_id} />

        {/* Napis na karcie lojalnościowej */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("portal_loyalty_text_title", lang)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portal_loyalty_text_desc", lang)}
          </p>
          <div className="space-y-2">
            {textFields.map((field) =>
              location.active_languages.includes(field.lang) ? (
                <div key={field.name} className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {field.label}
                  </span>
                  <input
                    name={field.name}
                    type="text"
                    maxLength={80}
                    defaultValue={field.value ?? ""}
                    placeholder={t("loyalty_program", lang)}
                    className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <input key={field.name} type="hidden" name={field.name} value={field.value ?? ""} />
              )
            )}
          </div>
        </section>

        {/* Liczba pieczątek do nagrody */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("portal_loyalty_stamps_title", lang)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portal_loyalty_stamps_desc", lang)}
          </p>
          <select
            name="loyalty_stamps_required"
            defaultValue={location.loyalty_stamps_required ?? 10}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STAMP_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </section>

        <div className="flex justify-end">
          <SubmitButton lang={lang}>{t("portal_save", lang)}</SubmitButton>
        </div>
      </form>
    </div>
  );
}
