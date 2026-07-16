import type { CustomerLocation } from "@/lib/types";
import ThemeSettings from "../../settings/ThemeSettings";
import { updatePortalPassword } from "../../settings/actions";
import { updateActiveLanguages } from "../../settings/[subscriptionId]/actions";
import SubmitButton from "../../SubmitButton";
import SavableForm from "../../SavableForm";
import { AutoSaveToggle, AutoSavePendingHint } from "../../settings/AutoSaveControls";
import { t } from "@/lib/translations";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

export default function LocationSettings({
  subscriptionId,
  location,
  lang,
}: {
  subscriptionId: number;
  location: CustomerLocation;
  lang: string;
}) {
  return (
    <div className="space-y-4">
      {/* Wygląd */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_theme_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_theme_desc", lang)}
        </p>
        <ThemeSettings lang={lang} />
      </section>

      {/* Aktywne języki */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_active_languages_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_active_languages_desc", lang)}
        </p>
        <SavableForm
          action={updateActiveLanguages}
          className="space-y-2"
          lang={lang}
          errorMessages={{ min_one: t("portal_active_languages_min_one", lang) }}
        >
          <input type="hidden" name="location_id" value={location.location_id} />
          <input type="hidden" name="subscription_id" value={subscriptionId} />
          {SUPPORTED_LANGUAGES.map((l) => (
            <label key={l} className="flex items-center gap-3 cursor-pointer">
              <AutoSaveToggle
                name={`lang_${l}`}
                defaultChecked={location.active_languages.includes(l)}
                ariaLabel={l.toUpperCase()}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {l.toUpperCase()}
              </span>
            </label>
          ))}
          <AutoSavePendingHint lang={lang} />
        </SavableForm>
      </section>

      {/* Hasło */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_password_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_password_desc", lang)}
        </p>
        <SavableForm
          action={updatePortalPassword}
          className="space-y-3"
          lang={lang}
          errorMessages={{
            mismatch: t("portal_password_mismatch", lang),
            short: t("portal_password_too_short", lang),
            failed: t("portal_password_failed", lang),
          }}
        >
          <input type="hidden" name="subscription_id" value={subscriptionId} />
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              name="password"
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder={t("portal_password_new", lang)}
              className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="password_confirm"
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder={t("portal_password_confirm", lang)}
              className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <SubmitButton lang={lang} className="shrink-0">
              {t("portal_save", lang)}
            </SubmitButton>
          </div>
        </SavableForm>
      </section>
    </div>
  );
}
