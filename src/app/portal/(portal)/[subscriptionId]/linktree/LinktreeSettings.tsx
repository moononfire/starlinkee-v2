import type { CustomerLocation, CustomerLocationLink } from "@/lib/types";
import { isLinkIconKey } from "@/lib/linkIcons";
import { isTileBackgroundKey } from "@/lib/linkBackgrounds";
import { isPageBackgroundKey } from "@/lib/pageBackgrounds";
import LinktreeLinksEditor from "../../settings/LinktreeLinksEditor";
import { updateScanRedirectMode, updateLinktreeSlug } from "../../settings/actions";
import SubmitButton from "../../SubmitButton";
import SavableForm from "../../SavableForm";
import { AutoSaveRadio, AutoSavePendingHint } from "../../settings/AutoSaveControls";
import { t } from "@/lib/translations";

export default function LinktreeSettings({
  subscriptionId,
  location,
  locationLinks,
  lang,
}: {
  subscriptionId: number;
  location: CustomerLocation;
  locationLinks: CustomerLocationLink[];
  lang: string;
}) {
  return (
    <div className="space-y-4">
      {/* Tryb skanowania */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("portal_scan_mode_title", lang)}
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_scan_mode_desc", lang)}
        </p>
        <SavableForm action={updateScanRedirectMode} className="space-y-3" lang={lang}>
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
        </SavableForm>
      </section>

      {/* Linki Linktree */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {lang === "pl" ? "Elementy na profilu" : "Profile Elements"}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {lang === "pl" ? "Dostosuj zawartość swojego profilu. Możesz dodać do 7 własnych linków i dowolnie zmieniać kolejność wszystkich elementów." : "Customize your profile content. You can add up to 7 custom links and freely reorder all elements."}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          {lang === "pl" ? "Wybierz język z paska poniżej, aby przetłumaczyć napisy dla obcokrajowców. Klient automatycznie zobaczy wersję dopasowaną do języka jego telefonu." : "Select a language from the bar below to translate the text for foreigners. Customers will automatically see the version matching their phone's language."}
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
          lang={lang}
          locationName={location.location_name}
          logoUrl={location.logo_link}
          hasPromo={location.has_promo_enabled}
          promoBannerText={location.promo_banner_text}
          hasLoyalty={location.has_loyalty_enabled}
          hasWifi={location.has_wifi_enabled}
          hasMenu={location.has_menu_enabled}
          initialModuleOrder={location.module_order}
          initialPromoBanner={{
            pl: location.promo_banner_text ?? "",
            en: location.promo_banner_text_en ?? "",
            de: location.promo_banner_text_de ?? "",
          }}
          initialLoyaltyBanner={{
            pl: location.loyalty_banner_text ?? "",
            en: location.loyalty_banner_text_en ?? "",
            de: location.loyalty_banner_text_de ?? "",
          }}
          initialWifiBanner={{
            pl: location.wifi_banner_text ?? "",
            en: location.wifi_banner_text_en ?? "",
            de: location.wifi_banner_text_de ?? "",
          }}
          initialMenuBanner={{
            pl: location.menu_banner_text ?? "",
            en: location.menu_banner_text_en ?? "",
            de: location.menu_banner_text_de ?? "",
          }}
          initialReviewBanner={{
            pl: location.review_banner_text ?? "",
            en: location.review_banner_text_en ?? "",
            de: location.review_banner_text_de ?? "",
          }}
          initialReviewShowStar={location.review_show_star ?? true}
        />
      </section>

      {/* Adres Linktree */}
      {location.linktree_slug && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("portal_linktree_slug_title", lang)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portal_linktree_slug_desc", lang)}
          </p>
          <SavableForm
            action={updateLinktreeSlug}
            lang={lang}
            errorMessages={{
              taken: t("portal_linktree_slug_taken", lang),
              invalid: t("portal_linktree_slug_invalid", lang),
            }}
          >
            <input type="hidden" name="location_id" value={location.location_id} />
            <input type="hidden" name="subscription_id" value={subscriptionId} />
            <div className="flex flex-wrap gap-3">
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
            </div>
          </SavableForm>
        </section>
      )}
    </div>
  );
}
