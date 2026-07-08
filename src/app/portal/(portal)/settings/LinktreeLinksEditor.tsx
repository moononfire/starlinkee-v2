"use client";

import { useState } from "react";
import { upsertLinktreeLinks } from "./[subscriptionId]/actions";
import { t } from "@/lib/translations";
import { SUPPORTED_LANGUAGES, type Language } from "@/lib/language";

interface LinkItem {
  title_pl: string;
  title_en: string;
  title_de: string;
  url: string;
}

interface Props {
  locationId: number;
  subscriptionId: number;
  initialLinks: LinkItem[];
  activeLanguages: Language[];
  saved?: boolean;
  lang: string;
}

const MAX_LINKS = 7;
type LinkLang = (typeof SUPPORTED_LANGUAGES)[number];

export default function LinktreeLinksEditor({ locationId, subscriptionId, initialLinks, activeLanguages, saved, lang }: Props) {
  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [activeTab, setActiveTab] = useState<Record<number, LinkLang>>({});
  const linkLangs = SUPPORTED_LANGUAGES.filter((l) => activeLanguages.includes(l));
  const defaultLang = linkLangs[0] ?? "pl";

  const addLink = () => {
    if (links.length >= MAX_LINKS) return;
    setLinks([...links, { title_pl: "", title_en: "", title_de: "", url: "" }]);
  };

  const removeLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
  };

  const update = (idx: number, field: keyof LinkItem, value: string) => {
    const next = [...links];
    next[idx] = { ...next[idx], [field]: value };
    setLinks(next);
  };

  return (
    <form action={upsertLinktreeLinks} className="space-y-2">
      <input type="hidden" name="location_id" value={locationId} />
      <input type="hidden" name="subscription_id" value={subscriptionId} />
      <input type="hidden" name="links_json" value={JSON.stringify(links)} />

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium select-none">
        <span>⭐</span>
        <span className="flex-1">{t("portal_leave_review_link", lang)}</span>
        <span className="text-xs text-blue-400 dark:text-blue-500">{t("portal_fixed", lang)}</span>
      </div>

      {links.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
          {t("portal_no_custom_links", lang)}
        </p>
      )}

      {links.map((link, idx) => {
        const tab = activeTab[idx] ?? defaultLang;
        const fieldKey = `title_${tab}` as const;

        return (
          <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1">
                {linkLangs.map((l) => {
                  const filled = link[`title_${l}` as const].trim().length > 0;
                  const isActive = tab === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setActiveTab((prev) => ({ ...prev, [idx]: l }))}
                      className={`relative px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        isActive
                          ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {l.toUpperCase()}
                      {filled && (
                        <span
                          className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                            isActive ? "bg-green-400" : "bg-green-500"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => removeLink(idx)}
                aria-label={t("portal_remove_link", lang)}
                className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder={t("portal_link_name_placeholder", lang)}
              value={link[fieldKey]}
              onChange={(e) => update(idx, fieldKey, e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={60}
            />
            <input
              type="url"
              placeholder="https://..."
              value={link.url}
              onChange={(e) => update(idx, "url", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );
      })}

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-sm font-medium select-none">
        <span className="flex-1">{t("portal_claim_promo_link", lang)}</span>
        <span className="text-xs text-amber-400 dark:text-amber-600">{t("portal_fixed", lang)}</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium select-none">
        <span className="flex-1">{t("portal_loyalty_card_link_label", lang)}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{t("portal_fixed", lang)}</span>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={addLink}
          disabled={links.length >= MAX_LINKS}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + {t("portal_add_link", lang)} ({links.length}/{MAX_LINKS})
        </button>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t("portal_save", lang)}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {t("portal_saved_toast", lang)}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
