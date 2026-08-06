"use client";

import { useState } from "react";
import { t } from "@/lib/translations";
import { SUPPORTED_LANGUAGES, type Language } from "@/lib/languages";

const LANGUAGE_LABELS: Record<Language, string> = {
  pl: "Polski",
  en: "English",
  de: "Deutsch",
};

const STAMP_OPTIONS = [5, 6, 7, 8, 9, 10];

type LocalizedText = Record<Language, string>;

interface Props {
  initialCardText: LocalizedText;
  initialRewardText: LocalizedText;
  initialStampsRequired: number;
  logoLink: string | null;
  locationName: string;
  activeLanguages: Language[];
  lang: string;
}

function fieldName(base: string, editLang: Language): string {
  return editLang === "pl" ? base : `${base}_${editLang}`;
}

export default function LoyaltyPreviewEditor({
  initialCardText,
  initialRewardText,
  initialStampsRequired,
  logoLink,
  locationName,
  activeLanguages,
  lang,
}: Props) {
  const editableLanguages = SUPPORTED_LANGUAGES.filter((l) => activeLanguages.includes(l));
  const [editLang, setEditLang] = useState<Language>(editableLanguages[0] ?? "pl");
  const [cardText, setCardText] = useState<LocalizedText>(initialCardText);
  const [rewardText, setRewardText] = useState<LocalizedText>(initialRewardText);
  const [stampsRequired, setStampsRequired] = useState(initialStampsRequired);

  const stampsCollected = Math.max(1, Math.min(stampsRequired - 1, Math.ceil(stampsRequired * 0.6)));

  function hiddenInputsFor(base: string, values: LocalizedText, active: Language) {
    return SUPPORTED_LANGUAGES.filter((l) => l !== active).map((l) => (
      <input key={l} type="hidden" name={fieldName(base, l)} value={values[l]} />
    ));
  }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-4 flex items-center gap-3">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {t("portal_loyalty_editing_language", lang)}
        </span>
        <div className="flex gap-1">
          {editableLanguages.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setEditLang(l)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                editLang === l
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {LANGUAGE_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Strona powitalna */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
          {t("portal_loyalty_card_preview_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          {t("portal_loyalty_card_preview_desc", lang)}
        </p>

        <div className="flex justify-center">
          <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-7 w-full max-w-xs">
            {logoLink ? (
              <img
                src={logoLink}
                alt={locationName}
                className="w-16 h-16 object-contain rounded-xl mx-auto mb-4"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-200 mx-auto mb-4" />
            )}
            <p className="text-xl font-semibold text-gray-800 text-center mb-1">{locationName}</p>

            {hiddenInputsFor("loyalty_card_text", cardText, editLang)}
            <textarea
              name={fieldName("loyalty_card_text", editLang)}
              value={cardText[editLang]}
              onChange={(e) => setCardText({ ...cardText, [editLang]: e.target.value })}
              placeholder={t("portal_loyalty_card_text_placeholder", editLang)}
              rows={2}
              maxLength={80}
              className="w-full text-sm text-gray-500 text-center bg-transparent border border-dashed border-gray-300 hover:border-blue-300 focus:border-blue-400 rounded-lg px-2 py-1.5 mb-6 resize-none focus:outline-none transition-colors placeholder-gray-300"
            />

            <div className="flex flex-col gap-4 opacity-40 pointer-events-none select-none">
              <p className="text-sm text-gray-600 text-center">
                {t("loyalty_app_prompt", editLang)}
              </p>
              <div className="bg-black text-white rounded-lg px-4 py-3 text-sm font-medium text-center">
                {t("open_in_app_button", editLang)}
              </div>
              <div className="text-center text-sm text-gray-500 underline">
                {t("download_app_link", editLang)}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 border-dashed">
              <p className="text-xs font-medium text-gray-400 text-center uppercase tracking-wider mb-4">
                {t("portal_loyalty_stamps_title", editLang)}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-3 pointer-events-none select-none">
                {Array.from({ length: stampsRequired }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs ${
                      i < stampsCollected
                        ? "bg-amber-400 border-amber-500 text-white"
                        : "border-gray-300 text-transparent"
                    }`}
                  >
                    ★
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center pointer-events-none select-none">
                {stampsCollected}/{stampsRequired} {t("portal_loyalty_stamp_progress_label", editLang)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-5">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {t("portal_loyalty_stamps_title", lang)}
          </span>
          <select
            name="loyalty_stamps_required"
            value={stampsRequired}
            onChange={(e) => setStampsRequired(Number(e.target.value))}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STAMP_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Ekran odbioru nagrody */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
          {t("portal_loyalty_reward_preview_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          {t("portal_loyalty_reward_preview_desc", lang)}
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
            <p className="text-xs text-gray-500 text-center mb-4">
              {t("portal_loyalty_reward_ready_label", editLang)}
            </p>

            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-5">
              {hiddenInputsFor("loyalty_reward_text", rewardText, editLang)}
              <textarea
                name={fieldName("loyalty_reward_text", editLang)}
                value={rewardText[editLang]}
                onChange={(e) => setRewardText({ ...rewardText, [editLang]: e.target.value })}
                placeholder={t("portal_loyalty_reward_placeholder", editLang)}
                rows={2}
                className="w-full text-amber-900 font-semibold text-sm text-center bg-transparent border-none resize-none focus:outline-none focus:ring-0 placeholder-amber-300"
              />
            </div>

            <div className="flex flex-col items-center gap-3 opacity-40 pointer-events-none select-none">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                {t("portal_loyalty_redeem_code_label", editLang)}
              </p>
              <p className="text-xl font-mono font-bold tracking-widest text-gray-900">B7K3X9A2</p>
              <div className="bg-white p-2 rounded-xl border border-gray-100">
                <div className="w-20 h-20 bg-gray-200 rounded" />
              </div>
              <p className="text-xs text-gray-500 text-center">{t("portal_loyalty_show_staff", editLang)}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
