"use client";

import { useActionState, useEffect, useState } from "react";
import { upsertLinktreeLinks } from "./[subscriptionId]/actions";
import { initialActionResult, type ActionResult } from "../action-result";
import { t } from "@/lib/translations";
import { SUPPORTED_LANGUAGES, type Language } from "@/lib/languages";
import { LINK_ICON_KEYS, LinkIconGlyph, type LinkIconKey } from "@/lib/linkIcons";
import { TILE_BACKGROUND_GROUPS, getTileBackground, type TileBackgroundKey } from "@/lib/linkBackgrounds";
import { PAGE_BACKGROUND_KEYS, getPageBackground, type PageBackgroundKey } from "@/lib/pageBackgrounds";
import LinktreePreview from "@/components/linktree/LinktreePreview";

interface LinkItem {
  title_pl: string;
  title_en: string;
  title_de: string;
  url: string;
  icon: LinkIconKey | null;
  background: TileBackgroundKey | null;
}

interface Props {
  locationId: number;
  subscriptionId: number;
  initialLinks: LinkItem[];
  initialPageBackground: PageBackgroundKey | null;
  activeLanguages: Language[];
  lang: string;
  locationName: string;
  logoUrl: string | null;
  hasPromo: boolean;
  promoBannerText: string | null;
  hasLoyalty: boolean;
}

const MAX_LINKS = 7;
type LinkLang = (typeof SUPPORTED_LANGUAGES)[number];
type LinkTab = "all" | LinkLang;

export default function LinktreeLinksEditor({
  locationId,
  subscriptionId,
  initialLinks,
  initialPageBackground,
  activeLanguages,
  lang,
  locationName,
  logoUrl,
  hasPromo,
  promoBannerText,
  hasLoyalty,
}: Props) {
  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [pageBackground, setPageBackground] = useState<PageBackgroundKey | null>(initialPageBackground);
  const [activeTab, setActiveTab] = useState<Record<number, LinkTab>>({});
  const [expandedStyleIdx, setExpandedStyleIdx] = useState<number | null>(null);
  const linkLangs = SUPPORTED_LANGUAGES.filter((l) => activeLanguages.includes(l));
  const defaultLang = linkLangs[0] ?? "pl";
  const [previewLang, setPreviewLang] = useState<LinkLang>(defaultLang);

  const [state, formAction, isPending] = useActionState(
    async (_prev: ActionResult, formData: FormData) => upsertLinktreeLinks(formData),
    initialActionResult
  );
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!state.ok) return;
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  const previewTitle = (link: LinkItem) => {
    for (const l of linkLangs) {
      const value = link[`title_${l}` as const];
      if (value.trim()) return value;
    }
    return "";
  };

  const addLink = () => {
    if (links.length >= MAX_LINKS) return;
    setLinks([...links, { title_pl: "", title_en: "", title_de: "", url: "", icon: null, background: null }]);
  };

  const removeLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
    setExpandedStyleIdx(null);
  };

  const update = (idx: number, field: keyof LinkItem, value: string) => {
    const next = [...links];
    next[idx] = { ...next[idx], [field]: value };
    setLinks(next);
  };

  const updateAllLangs = (idx: number, value: string) => {
    const next = [...links];
    const patch: Partial<LinkItem> = {};
    for (const l of linkLangs) patch[`title_${l}` as const] = value;
    next[idx] = { ...next[idx], ...patch };
    setLinks(next);
  };

  const setIcon = (idx: number, icon: LinkIconKey | null) => {
    const next = [...links];
    next[idx] = { ...next[idx], icon };
    setLinks(next);
  };

  const setBackground = (idx: number, background: TileBackgroundKey | null) => {
    const next = [...links];
    next[idx] = { ...next[idx], background };
    setLinks(next);
  };

  return (
    <div className="lg:flex lg:items-start lg:gap-6">
    <form action={formAction} className="space-y-2 lg:flex-1 lg:min-w-0">
      <input type="hidden" name="location_id" value={locationId} />
      <input type="hidden" name="subscription_id" value={subscriptionId} />
      <input type="hidden" name="links_json" value={JSON.stringify(links)} />
      <input type="hidden" name="page_background" value={pageBackground ?? ""} />

      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t("portal_page_bg_label", lang)}</p>
        <div className="flex flex-wrap gap-1.5">
          {PAGE_BACKGROUND_KEYS.map((bgKey) => (
            <button
              key={bgKey}
              type="button"
              onClick={() => setPageBackground(bgKey === "default" ? null : bgKey)}
              aria-label={bgKey}
              title={bgKey}
              className={`w-7 h-7 rounded-full ${getPageBackground(bgKey).swatch} ${
                (pageBackground ?? "default") === bgKey ? "ring-2 ring-offset-1 ring-blue-500" : ""
              }`}
            />
          ))}
        </div>
      </div>

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
        const tab = activeTab[idx] ?? "all";
        const fieldKey = `title_${tab === "all" ? defaultLang : tab}` as const;

        return (
          <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab((prev) => ({ ...prev, [idx]: "all" }))}
                  className={`relative px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    tab === "all"
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t("portal_link_lang_all", lang)}
                </button>
                {linkLangs.map((l) => {
                  const filled = link[`title_${l}` as const].trim().length > 0;
                  const isActive = tab === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        setActiveTab((prev) => ({ ...prev, [idx]: l }));
                        setPreviewLang(l);
                      }}
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
              onChange={(e) => (tab === "all" ? updateAllLangs(idx, e.target.value) : update(idx, fieldKey, e.target.value))}
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

            <div>
              <button
                type="button"
                onClick={() => setExpandedStyleIdx((prev) => (prev === idx ? null : idx))}
                aria-expanded={expandedStyleIdx === idx}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-gray-700 ${getTileBackground(link.background).swatch}`}
                >
                  <LinkIconGlyph icon={link.icon} className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 text-left text-xs text-gray-500 dark:text-gray-400">
                  {t("portal_link_style_label", lang)}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedStyleIdx === idx ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {expandedStyleIdx === idx && (
                <div className="mt-2 space-y-3 pl-1">
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t("portal_link_icon_label", lang)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIcon(idx, null)}
                        aria-label={t("portal_link_icon_none", lang)}
                        title={t("portal_link_icon_none", lang)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg border text-[10px] font-medium transition-colors ${
                          link.icon === null
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300"
                            : "border-gray-200 dark:border-gray-600 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        {t("portal_link_icon_none_short", lang)}
                      </button>
                      {LINK_ICON_KEYS.map((iconKey) => (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => setIcon(idx, iconKey)}
                          aria-label={iconKey}
                          title={iconKey}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                            link.icon === iconKey
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300"
                              : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`}
                        >
                          <LinkIconGlyph icon={iconKey} className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t("portal_link_bg_label", lang)}</p>
                    <div className="flex flex-col gap-1.5">
                      {TILE_BACKGROUND_GROUPS.map((group, groupIdx) => (
                        <div key={group.key} className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 w-14 shrink-0">
                            {t(`portal_link_bg_group_${group.key}`, lang)}
                          </span>
                          {groupIdx === 0 && (
                            <button
                              type="button"
                              onClick={() => setBackground(idx, null)}
                              aria-label={t("portal_link_icon_none", lang)}
                              title={t("portal_link_icon_none", lang)}
                              className={`w-7 h-7 rounded-full ${getTileBackground(null).swatch} ${
                                link.background === null ? "ring-2 ring-offset-1 ring-blue-500" : ""
                              }`}
                            />
                          )}
                          {group.keys.map((bgKey) => (
                            <button
                              key={bgKey}
                              type="button"
                              onClick={() => setBackground(idx, bgKey)}
                              aria-label={bgKey}
                              title={bgKey}
                              className={`w-7 h-7 rounded-full ${getTileBackground(bgKey).swatch} ${
                                link.background === bgKey ? "ring-2 ring-offset-1 ring-blue-500" : ""
                              }`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? t("portal_saving", lang) : t("portal_save", lang)}
          </button>
          {showSaved && (
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

      <div className="mt-6 lg:mt-0 lg:sticky lg:top-4 lg:w-64 lg:shrink-0">
        <LinktreePreview
          locationName={locationName}
          logoUrl={logoUrl}
          pageBackground={pageBackground}
          links={links.map((l) => ({
            title: previewTitle(l),
            url: l.url,
            icon: l.icon,
            background: l.background,
          }))}
          hasPromo={hasPromo}
          promoBannerText={promoBannerText}
          hasLoyalty={hasLoyalty}
          lang={lang}
          contentLang={previewLang}
        />
      </div>
    </div>
  );
}
