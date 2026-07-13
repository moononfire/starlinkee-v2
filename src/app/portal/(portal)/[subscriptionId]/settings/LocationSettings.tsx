import type { CustomerLocation, CustomerLocationLink } from "@/lib/types";
import { isLinkIconKey } from "@/lib/linkIcons";
import { isTileBackgroundKey } from "@/lib/linkBackgrounds";
import { isPageBackgroundKey } from "@/lib/pageBackgrounds";
import GoogleLocationEditor from "../../settings/GoogleLocationEditor";
import LogoUpload from "../../settings/LogoUpload";
import LinktreeLinksEditor from "../../settings/LinktreeLinksEditor";
import {
  updateScanRedirectMode,
  updateLinktreeSlug,
  updateFourStarRedirect,
  updatePortalPassword,
} from "../../settings/actions";
import {
  updateLocationName,
  updateSupportEmail,
  updateActiveLanguages,
} from "../../settings/[subscriptionId]/actions";
import SubmitButton from "../../SubmitButton";
import {
  AutoSaveRadio,
  AutoSaveToggle,
  AutoSavePendingHint,
} from "../../settings/AutoSaveControls";
import { t } from "@/lib/translations";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

export default function LocationSettings({
  subscriptionId,
  location,
  locationLinks,
  linktreeError,
  passwordError,
  saved,
  lang,
}: {
  subscriptionId: number;
  location: CustomerLocation;
  locationLinks: CustomerLocationLink[];
  linktreeError?: string;
  passwordError?: string;
  saved?: string;
  lang: string;
}) {
  return (
    <div className="space-y-4">
      {/* Nazwa lokalu */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_location_name_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_location_name_desc", lang)}
        </p>
        <form action={updateLocationName} className="flex gap-3">
          <input type="hidden" name="subscription_id" value={subscriptionId} />
          <input type="hidden" name="location_id" value={location.location_id} />
          <input
            name="location_name"
            required
            type="text"
            defaultValue={location.location_name}
            className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <SubmitButton lang={lang} className="shrink-0">
            {t("portal_save", lang)}
          </SubmitButton>
        </form>
      </section>

      {/* Google Maps */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_google_maps_location_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_google_maps_location_desc", lang)}
        </p>
        <GoogleLocationEditor
          locationId={location.location_id}
          locationName={location.location_name}
          currentBusinessName={location.google_business_name}
          currentBusinessAddress={location.google_business_address}
          saved={saved === "google_location"}
          lang={lang}
        />
      </section>

      {/* Logo */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_logo_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_logo_desc", lang)}
        </p>
        <LogoUpload
          locationId={location.location_id}
          locationName={location.location_name}
          currentLogoLink={location.logo_link}
          lang={lang}
        />
      </section>

      {/* E-mail pomocniczy */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_support_email_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_support_email_desc", lang)}
        </p>
        <form action={updateSupportEmail} className="flex gap-3">
          <input type="hidden" name="subscription_id" value={subscriptionId} />
          <input type="hidden" name="location_id" value={location.location_id} />
          <input
            name="support_email"
            required
            type="email"
            defaultValue={location.support_email ?? ""}
            className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <SubmitButton lang={lang} className="shrink-0">
            {t("portal_save", lang)}
          </SubmitButton>
        </form>
      </section>

      {/* Aktywne języki */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_active_languages_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_active_languages_desc", lang)}
        </p>
        <form action={updateActiveLanguages} className="space-y-2">
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
        </form>
      </section>

      {/* Tryb skanowania */}
      {location.has_linktree_access && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t("portal_scan_mode_title", lang)}
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portal_scan_mode_desc", lang)}
          </p>
          <form action={updateScanRedirectMode} className="space-y-3">
            <input type="hidden" name="location_id" value={location.location_id} />
            <label className="flex items-start gap-3 cursor-pointer">
              <AutoSaveRadio
                name="scan_redirect_mode"
                value="review"
                defaultChecked={location.scan_redirect_mode === "review"}
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t("portal_scan_mode_review_title", lang)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("portal_scan_mode_review_desc", lang)}
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <AutoSaveRadio
                name="scan_redirect_mode"
                value="linktree"
                defaultChecked={location.scan_redirect_mode === "linktree"}
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t("portal_scan_mode_linktree_title", lang)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("portal_scan_mode_linktree_desc", lang)}
                </p>
              </div>
            </label>
            <AutoSavePendingHint lang={lang} />
          </form>
        </section>
      )}

      {/* Linki Linktree */}
      {location.has_linktree_access && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("portal_linktree_links_title", lang)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t("portal_linktree_links_desc", lang)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            {t("portal_linktree_lang_hint", lang)}
          </p>
          <LinktreeLinksEditor
            locationId={location.location_id}
            subscriptionId={subscriptionId}
            initialLinks={locationLinks.map((l) => ({
              title_pl: l.title_pl ?? l.title,
              title_en: l.title_en ?? "",
              title_de: l.title_de ?? "",
              url: l.url,
              icon: isLinkIconKey(l.icon) ? l.icon : null,
              background: isTileBackgroundKey(l.background) ? l.background : null,
            }))}
            initialPageBackground={isPageBackgroundKey(location.page_background) ? location.page_background : null}
            activeLanguages={location.active_languages}
            saved={saved === "linktree_links"}
            lang={lang}
            locationName={location.location_name}
            logoUrl={location.logo_link}
            hasPromo={location.has_promo_enabled}
            promoBannerText={location.promo_banner_text}
            hasLoyalty={location.has_loyalty_enabled}
          />
        </section>
      )}

      {/* Adres Linktree */}
      {location.has_linktree_access && location.linktree_slug && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("portal_linktree_slug_title", lang)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portal_linktree_slug_desc", lang)}
          </p>
          <form action={updateLinktreeSlug} className="flex gap-3">
            <input type="hidden" name="location_id" value={location.location_id} />
            <input type="hidden" name="subscription_id" value={subscriptionId} />
            <div className="flex-1 min-w-0 flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500">
              <span className="pl-3 text-sm text-gray-400 dark:text-gray-500">/l/</span>
              <input
                name="linktree_slug"
                required
                type="text"
                pattern="[a-z0-9-]{3,40}"
                defaultValue={location.linktree_slug}
                className="flex-1 min-w-0 bg-transparent px-1 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
              />
            </div>
            <SubmitButton lang={lang} className="shrink-0">
              {t("portal_save", lang)}
            </SubmitButton>
          </form>
          {linktreeError === "taken" && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              {t("portal_linktree_slug_taken", lang)}
            </p>
          )}
          {linktreeError === "invalid" && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              {t("portal_linktree_slug_invalid", lang)}
            </p>
          )}
        </section>
      )}

      {/* Przekierowanie dla oceny 4 gwiazdek */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_four_star_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_four_star_desc", lang)}
        </p>
        <form action={updateFourStarRedirect}>
          <input type="hidden" name="location_id" value={location.location_id} />
          <label className="flex items-start gap-3 cursor-pointer">
            <AutoSaveToggle
              name="redirect_four_star_reviews"
              defaultChecked={location.redirect_four_star_reviews}
              ariaLabel={t("portal_four_star_checkbox_label", lang)}
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t("portal_four_star_checkbox_label", lang)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("portal_four_star_checkbox_desc", lang)}
              </p>
            </div>
          </label>
          <div className="mt-2">
            <AutoSavePendingHint lang={lang} />
          </div>
        </form>
      </section>

      {/* Hasło */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_password_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_password_desc", lang)}
        </p>
        <form action={updatePortalPassword} className="space-y-3">
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
          {passwordError === "mismatch" && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {t("portal_password_mismatch", lang)}
            </p>
          )}
          {passwordError === "short" && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {t("portal_password_too_short", lang)}
            </p>
          )}
          {passwordError === "failed" && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {t("portal_password_failed", lang)}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
