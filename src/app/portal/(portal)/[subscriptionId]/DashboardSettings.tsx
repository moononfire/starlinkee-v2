"use client";

import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { CustomerLocation } from "@/lib/types";
import { t } from "@/lib/translations";
import { updateFourStarRedirect } from "../settings/actions";
import { updateLocationName, updateSupportEmail } from "../settings/[subscriptionId]/actions";
import GoogleLocationEditor from "../settings/GoogleLocationEditor";
import LogoUpload from "../settings/LogoUpload";
import SubmitButton from "../SubmitButton";
import SavableForm from "../SavableForm";
import { AutoSaveToggle, AutoSavePendingHint } from "../settings/AutoSaveControls";

interface Props {
  subscriptionId: number;
  location: CustomerLocation | null;
  scrollTo?: string;
  lang: string;
}

export default function DashboardSettings({ subscriptionId, location, scrollTo, lang }: Props) {
  const logoSectionRef = useRef<HTMLDivElement>(null);
  const [logoHighlighted, setLogoHighlighted] = useState(false);

  function scrollAndHighlight(
    ref: React.RefObject<HTMLDivElement | null>,
    setHighlighted: (v: boolean) => void
  ) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlighted(true);
    setTimeout(() => setHighlighted(false), 2000);
  }

  const searchParams = useSearchParams();
  const timestamp = searchParams.get("t");

  useEffect(() => {
    if (!scrollTo) return;
    const timer = setTimeout(() => {
      if (scrollTo === "logo") {
        scrollAndHighlight(logoSectionRef, setLogoHighlighted);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [scrollTo, timestamp]);

  return (
    <div className="space-y-5">

      {/* Nazwa lokalu */}
      {location && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("portal_location_name_title", lang)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portal_location_name_desc", lang)}
          </p>
          <SavableForm action={updateLocationName} lang={lang}>
            <input type="hidden" name="subscription_id" value={subscriptionId} />
            <input type="hidden" name="location_id" value={location.location_id} />
            <div className="flex gap-3">
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
            </div>
          </SavableForm>
        </div>
      )}

      {/* Google Maps */}
      {location && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
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
            lang={lang}
          />
        </div>
      )}

      {/* Logo */}
      {location && (
        <div
          ref={logoSectionRef}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5 transition-shadow duration-300 ${
            logoHighlighted ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900" : ""
          }`}
        >
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
        </div>
      )}

      {/* E-mail pomocniczy */}
      {location && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("portal_support_email_title", lang)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portal_support_email_desc", lang)}
          </p>
          <SavableForm action={updateSupportEmail} lang={lang}>
            <input type="hidden" name="subscription_id" value={subscriptionId} />
            <input type="hidden" name="location_id" value={location.location_id} />
            <div className="flex gap-3">
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
            </div>
          </SavableForm>
        </div>
      )}

      {/* Przekierowanie dla oceny 4 gwiazdek */}
      {location && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("portal_four_star_title", lang)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portal_four_star_desc", lang)}
          </p>
          <SavableForm action={updateFourStarRedirect} lang={lang}>
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
          </SavableForm>
        </div>
      )}
    </div>
  );
}
