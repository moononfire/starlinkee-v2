"use client";

import { useState } from "react";
import { t } from "@/lib/translations";

interface Props {
  initialDescription: string;
  initialBannerText: string;
  initialSmsText: string;
  logoLink: string | null;
  locationName: string;
  lang: string;
}

export default function PromoPreviewEditor({
  initialDescription,
  initialBannerText,
  initialSmsText,
  logoLink,
  locationName,
  lang,
}: Props) {
  const [description, setDescription] = useState(initialDescription);
  const [bannerText, setBannerText] = useState(initialBannerText);
  const [smsText, setSmsText] = useState(initialSmsText);

  return (
    <div className="space-y-5">
      {/* Strona formularza */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
          {t("portal_promo_form_page_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          {t("portal_promo_form_page_desc", lang)}
        </p>

        <div className="flex justify-center">
          <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-7 w-full max-w-xs">
            {logoLink ? (
              <img
                src={logoLink}
                alt={locationName}
                className="w-12 h-12 object-cover rounded-full mx-auto mb-3"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-3" />
            )}
            <p className="text-sm font-semibold text-gray-800 text-center mb-2">{locationName}</p>

            <textarea
              name="promo_description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("portal_promo_description_placeholder", lang)}
              rows={2}
              className="w-full text-xs text-gray-500 text-center bg-transparent border border-dashed border-gray-300 hover:border-blue-300 focus:border-blue-400 rounded-lg px-2 py-1.5 mb-4 resize-none focus:outline-none transition-colors placeholder-gray-300"
            />

            <div className="flex flex-col gap-2 opacity-40 pointer-events-none select-none">
              <div className="border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-400 bg-white">
                +48 600 000 000
              </div>
              <div className="border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-400 bg-white">
                {t("portal_promo_email_optional", lang)}
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 border border-gray-300 rounded shrink-0 mt-0.5" />
                <span className="text-xs text-gray-400 leading-snug">
                  {t("portal_promo_consent_text", lang)}
                </span>
              </div>
              <div className="bg-black text-white text-center text-xs rounded-lg py-2 font-medium">
                {t("portal_promo_claim_button", lang)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strona kuponu */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
          {t("portal_promo_coupon_page_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          {t("portal_promo_coupon_page_desc", lang)}
        </p>

        <div className="flex justify-center">
          <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-7 w-full max-w-xs">
            {logoLink ? (
              <img
                src={logoLink}
                alt={locationName}
                className="w-12 h-12 object-cover rounded-full mx-auto mb-3"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-3" />
            )}
            <p className="text-sm font-semibold text-gray-800 text-center mb-1">{locationName}</p>
            <p className="text-xs text-gray-500 text-center mb-4">{t("portal_promo_your_coupon", lang)}</p>

            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-5">
              <textarea
                name="promo_banner_text"
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                placeholder={t("portal_promo_banner_placeholder", lang)}
                rows={2}
                className="w-full text-amber-900 font-semibold text-sm text-center bg-transparent border-none resize-none focus:outline-none focus:ring-0 placeholder-amber-300"
              />
            </div>

            <div className="flex flex-col items-center gap-3 opacity-40 pointer-events-none select-none">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                {t("portal_promo_coupon_code_label", lang)}
              </p>
              <p className="text-xl font-mono font-bold tracking-widest text-gray-900">A3K9X2B7</p>
              <div className="bg-white p-2 rounded-xl border border-gray-100">
                <div className="w-20 h-20 bg-gray-200 rounded" />
              </div>
              <p className="text-xs text-gray-500 text-center">{t("portal_promo_show_staff", lang)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SMS */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
          {t("portal_promo_sms_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {t("portal_promo_use_prefix", lang)}{" "}
          <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded text-gray-700 dark:text-gray-300">
            {"{link}"}
          </code>
          {t("portal_promo_sms_desc_suffix", lang)}
        </p>

        <div className="flex justify-center mb-4">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 max-w-xs w-full text-sm text-gray-800 dark:text-gray-200 min-h-[48px]">
            {smsText || (
              <span className="text-gray-400 dark:text-gray-500 text-xs">
                {t("portal_promo_sms_preview_placeholder", lang)}
              </span>
            )}
          </div>
        </div>

        <textarea
          name="promo_sms_text"
          value={smsText}
          onChange={(e) => setSmsText(e.target.value)}
          placeholder={t("portal_promo_sms_placeholder", lang)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {t("portal_promo_save_settings", lang)}
        </button>
      </div>
    </div>
  );
}
