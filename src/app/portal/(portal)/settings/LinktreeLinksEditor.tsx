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
  hasWifi?: boolean;
  hasMenu?: boolean;
  initialModuleOrder: string[] | null;
  initialPromoBanner: { pl: string; en: string; de: string };
  initialLoyaltyBanner: { pl: string; en: string; de: string };
  initialWifiBanner: { pl: string; en: string; de: string };
  initialMenuBanner: { pl: string; en: string; de: string };
  initialReviewBanner: { pl: string; en: string; de: string };
  initialReviewShowStar: boolean;
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
  hasWifi,
  hasMenu,
  initialModuleOrder,
  initialPromoBanner,
  initialLoyaltyBanner,
  initialWifiBanner,
  initialMenuBanner,
  initialReviewBanner,
  initialReviewShowStar,
}: Props) {
  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [pageBackground, setPageBackground] = useState<PageBackgroundKey | null>(initialPageBackground);
  // Modules state
  const defaultOrder = ["review", "promo", "loyalty", "wifi", "menu"];
  const [moduleOrder, setModuleOrder] = useState<string[]>(() => {
    let order = initialModuleOrder ? [...initialModuleOrder] : [...defaultOrder];
    if (!order.includes("review")) order = ["review", ...order];
    for (let i = 0; i < initialLinks.length; i++) {
      if (!order.includes(`link:${i}`)) order.push(`link:${i}`);
    }
    return order;
  });
  const [promoBanner, setPromoBanner] = useState(initialPromoBanner);
  const [loyaltyBanner, setLoyaltyBanner] = useState(initialLoyaltyBanner);
  const [wifiBanner, setWifiBanner] = useState(initialWifiBanner);
  const [menuBanner, setMenuBanner] = useState(initialMenuBanner);
  const [reviewBanner, setReviewBanner] = useState(initialReviewBanner);
  const [reviewShowStar, setReviewShowStar] = useState(initialReviewShowStar);
  const [globalLang, setGlobalLang] = useState<LinkTab>("all");

  const [expandedStyleIdx, setExpandedStyleIdx] = useState<number | null>(null);
  const linkLangs = SUPPORTED_LANGUAGES.filter((l) => activeLanguages.includes(l));
  // Use portal lang if it's in activeLanguages, otherwise fallback to the first active language or "pl"
  const defaultLang = (linkLangs.includes(lang as LinkLang) ? lang : linkLangs[0]) as LinkLang ?? "pl";
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
    const newIdx = links.length;
    setLinks((prev) => [...prev, { title_pl: "", title_en: "", title_de: "", url: "", icon: null, background: null }]);
    setModuleOrder((order) => [...order, `link:${newIdx}`]);
  };

  const removeLink = (idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
    setExpandedStyleIdx(null);
    setModuleOrder((prev) => {
      const next = prev.filter((m) => m !== `link:${idx}`);
      return next.map((m) => {
        if (m.startsWith("link:")) {
          const k = parseInt(m.substring(5), 10);
          if (k > idx) return `link:${k - 1}`;
        }
        return m;
      });
    });
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
      <input type="hidden" name="module_order" value={JSON.stringify(moduleOrder)} />
      <input type="hidden" name="promo_banner" value={JSON.stringify(promoBanner)} />
      <input type="hidden" name="loyalty_banner" value={JSON.stringify(loyaltyBanner)} />
      <input type="hidden" name="wifi_banner" value={JSON.stringify(wifiBanner)} />
      <input type="hidden" name="menu_banner" value={JSON.stringify(menuBanner)} />
      <input type="hidden" name="review_banner" value={JSON.stringify(reviewBanner)} />
      {reviewShowStar && <input type="hidden" name="review_show_star" value="on" />}

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



      <div className="pt-2 pb-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("portal_fixed_modules_title", lang) || "Modules"}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setGlobalLang("all")}
              className={`relative px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                globalLang === "all"
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {t("portal_link_lang_all", lang)}
            </button>
            {linkLangs.map((l) => {
              const isActive = globalLang === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setGlobalLang(l);
                    setPreviewLang(l);
                  }}
                  className={`relative px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="space-y-2">
          {moduleOrder.map((modId, index) => {
            if (modId.startsWith("link:")) {
              const idx = parseInt(modId.substring(5), 10);
              const link = links[idx];
              if (!link) return null;
              
              const fieldKey = `title_${globalLang === "all" ? defaultLang : globalLang}` as const;

              return (
                <div key={modId} className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {lang === "pl" ? "Własny link" : "Custom link"}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          const next = [...moduleOrder];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          setModuleOrder(next);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors text-gray-500"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === moduleOrder.length - 1}
                        onClick={() => {
                          const next = [...moduleOrder];
                          [next[index], next[index + 1]] = [next[index + 1], next[index]];
                          setModuleOrder(next);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors text-gray-500"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLink(idx)}
                        aria-label={t("portal_remove_link", lang)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder={t("portal_link_name_placeholder", lang)}
                    value={link[fieldKey]}
                    onChange={(e) => (globalLang === "all" ? updateAllLangs(idx, e.target.value) : update(idx, fieldKey, e.target.value))}
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
            }

            const isPromo = modId === "promo" && hasPromo;
            const isLoyalty = modId === "loyalty" && hasLoyalty;
            const isWifi = modId === "wifi" && hasWifi;
            const isMenu = modId === "menu" && hasMenu;
            const isReview = modId === "review";
            if (!isPromo && !isLoyalty && !isWifi && !isMenu && !isReview) return null;

            const titleMap: Record<string, string> = {
              promo: t("portal_claim_promo_link", lang),
              loyalty: t("portal_loyalty_card_link_label", lang),
              wifi: t("portal_tab_wifi", lang),
              menu: t("portal_tab_menu", lang),
              review: t("leave_review", lang),
            };
            const colorClassMap: Record<string, string> = {
              promo: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900 text-amber-700 dark:text-amber-400",
              loyalty: "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300",
              wifi: "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-400",
              menu: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400",
              review: "bg-blue-600/10 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",
            };
            const bannerStateMap: Record<string, any> = {
              promo: [promoBanner, setPromoBanner],
              loyalty: [loyaltyBanner, setLoyaltyBanner],
              wifi: [wifiBanner, setWifiBanner],
              menu: [menuBanner, setMenuBanner],
              review: [reviewBanner, setReviewBanner],
            };

            const [banner, setBanner] = bannerStateMap[modId];
            const fieldKey = globalLang === "all" ? defaultLang : globalLang;

            const updateBanner = (l: string, val: string) => {
              if (globalLang === "all") {
                const next = { ...banner };
                for (const langKey of linkLangs) next[langKey] = val;
                setBanner(next);
              } else {
                setBanner({ ...banner, [l]: val });
              }
            };

            return (
              <div key={modId} className={`rounded-lg border p-3 flex items-center gap-3 ${colorClassMap[modId]}`}>
                {modId === "review" && (
                  <label className="flex items-center gap-1 cursor-pointer shrink-0" title="Pokaż gwiazdkę / Show star icon">
                    <input
                      type="checkbox"
                      checked={reviewShowStar}
                      onChange={(e) => setReviewShowStar(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm">⭐</span>
                  </label>
                )}
                <input
                  type="text"
                  placeholder={titleMap[modId]}
                  value={banner[fieldKey] || ""}
                  onChange={(e) => updateBanner(fieldKey, e.target.value)}
                  className="flex-1 font-semibold rounded-md border-transparent bg-transparent text-current px-0 py-1 text-sm focus:outline-none focus:ring-0 placeholder:text-current placeholder:opacity-60"
                  maxLength={60}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...moduleOrder];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      setModuleOrder(next);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 disabled:opacity-30 transition-colors"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === moduleOrder.length - 1}
                    onClick={() => {
                      const next = [...moduleOrder];
                      [next[index], next[index + 1]] = [next[index + 1], next[index]];
                      setModuleOrder(next);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 disabled:opacity-30 transition-colors"
                  >
                    ↓
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
          hasWifi={hasWifi}
          hasMenu={hasMenu}
          moduleOrder={moduleOrder}
          loyaltyBannerText={loyaltyBanner[previewLang] || loyaltyBanner[defaultLang]}
          wifiBannerText={wifiBanner[previewLang] || wifiBanner[defaultLang]}
          menuBannerText={menuBanner[previewLang] || menuBanner[defaultLang]}
          reviewBannerText={reviewBanner[previewLang] || reviewBanner[defaultLang]}
          reviewShowStar={reviewShowStar}
          lang={lang}
          contentLang={previewLang}
        />
      </div>
    </div>
  );
}
