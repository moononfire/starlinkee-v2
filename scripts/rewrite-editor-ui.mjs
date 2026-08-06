import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'src/app/portal/(portal)/settings/LinktreeLinksEditor.tsx');
let content = readFileSync(filePath, 'utf8');

const startTag = '<div className="space-y-2">';
const endTag = '<div className="flex items-center justify-between pt-2">';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

const newBlock = `<div className="space-y-2">
          {moduleOrder.map((modId, index) => {
            if (modId.startsWith("link:")) {
              const idx = parseInt(modId.substring(5), 10);
              const link = links[idx];
              if (!link) return null;
              
              const tab = activeTab[idx] ?? "all";
              const fieldKey = \`title_\${tab === "all" ? defaultLang : tab}\` as const;

              return (
                <div key={modId} className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab((prev) => ({ ...prev, [idx]: "all" }))}
                        className={\`relative px-2.5 py-1 text-xs font-medium rounded-md transition-colors \${
                          tab === "all"
                            ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }\`}
                      >
                        {t("portal_link_lang_all", lang)}
                      </button>
                      {linkLangs.map((l) => {
                        const filled = link[\`title_\${l}\` as const].trim().length > 0;
                        const isActive = tab === l;
                        return (
                          <button
                            key={l}
                            type="button"
                            onClick={() => {
                              setActiveTab((prev) => ({ ...prev, [idx]: l }));
                              setPreviewLang(l);
                            }}
                            className={\`relative px-2.5 py-1 text-xs font-medium rounded-md transition-colors \${
                              isActive
                                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }\`}
                          >
                            {l.toUpperCase()}
                            {filled && (
                              <span
                                className={\`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full \${
                                  isActive ? "bg-green-400" : "bg-green-500"
                                }\`}
                              />
                            )}
                          </button>
                        );
                      })}
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
                        className={\`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-gray-700 \${getTileBackground(link.background).swatch}\`}
                      >
                        <LinkIconGlyph icon={link.icon} className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex-1 text-left text-xs text-gray-500 dark:text-gray-400">
                        {t("portal_link_style_label", lang)}
                      </span>
                      <svg
                        className={\`w-3.5 h-3.5 text-gray-400 transition-transform \${expandedStyleIdx === idx ? "rotate-180" : ""}\`}
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
                              className={\`w-8 h-8 flex items-center justify-center rounded-lg border text-[10px] font-medium transition-colors \${
                                link.icon === null
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300"
                                  : "border-gray-200 dark:border-gray-600 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                              }\`}
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
                                className={\`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors \${
                                  link.icon === iconKey
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300"
                                    : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }\`}
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
                                  {t(\`portal_link_bg_group_\${group.key}\`, lang)}
                                </span>
                                {groupIdx === 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setBackground(idx, null)}
                                    aria-label={t("portal_link_icon_none", lang)}
                                    title={t("portal_link_icon_none", lang)}
                                    className={\`w-7 h-7 rounded-full \${getTileBackground(null).swatch} \${
                                      link.background === null ? "ring-2 ring-offset-1 ring-blue-500" : ""
                                    }\`}
                                  />
                                )}
                                {group.keys.map((bgKey) => (
                                  <button
                                    key={bgKey}
                                    type="button"
                                    onClick={() => setBackground(idx, bgKey)}
                                    aria-label={bgKey}
                                    title={bgKey}
                                    className={\`w-7 h-7 rounded-full \${getTileBackground(bgKey).swatch} \${
                                      link.background === bgKey ? "ring-2 ring-offset-1 ring-blue-500" : ""
                                    }\`}
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
            const fieldKey = globalModulesLang === "all" ? defaultLang : globalModulesLang;

            const updateBanner = (l: string, val: string) => {
              if (globalModulesLang === "all") {
                const next = { ...banner };
                for (const langKey of linkLangs) next[langKey] = val;
                setBanner(next);
              } else {
                setBanner({ ...banner, [l]: val });
              }
            };

            return (
              <div key={modId} className={\`rounded-lg border p-3 flex items-center gap-3 \${colorClassMap[modId]}\`}>
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
      
`;

content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);

writeFileSync(filePath, content, 'utf8');
