"use client";

import { LinkIconGlyph } from "@/lib/linkIcons";
import { getTileBackground } from "@/lib/linkBackgrounds";
import { getPageBackground } from "@/lib/pageBackgrounds";
import { t } from "@/lib/translations";

interface PreviewLink {
  title: string;
  url: string;
  icon: string | null;
  background: string | null;
}

interface Props {
  locationName: string;
  logoUrl: string | null;
  links: PreviewLink[];
  pageBackground?: string | null;
  hasPromo: boolean;
  promoBannerText: string | null;
  hasLoyalty: boolean;
  hasWifi?: boolean;
  hasMenu?: boolean;
  moduleOrder?: string[] | null;
  loyaltyBannerText?: string | null;
  wifiBannerText?: string | null;
  menuBannerText?: string | null;
  reviewBannerText?: string | null;
  reviewShowStar?: boolean;
  lang: string;
  contentLang?: string;
}

export default function LinktreePreview({
  locationName,
  logoUrl,
  links,
  pageBackground,
  hasPromo,
  promoBannerText,
  hasLoyalty,
  hasWifi,
  hasMenu,
  moduleOrder,
  loyaltyBannerText,
  wifiBannerText,
  menuBannerText,
  reviewBannerText,
  reviewShowStar = true,
  lang,
  contentLang,
}: Props) {
  const previewLang = contentLang ?? lang;
  const visibleLinks = links.filter((l) => l.title.trim().length > 0);
  const mOrder = moduleOrder ?? ["promo", "loyalty", "wifi"];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[240px] rounded-[2rem] border-[6px] border-gray-900 dark:border-gray-700 bg-gray-900 dark:bg-gray-700 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-gray-900 dark:bg-gray-700 rounded-b-xl z-10" />
        <div className={`${getPageBackground(pageBackground).page} h-[480px] overflow-y-auto rounded-[1.5rem]`}>
          <div className="flex flex-col items-center gap-3 p-4 pt-6">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={locationName} className="h-12 w-12 object-cover rounded-full" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 text-lg font-semibold">
                {locationName.trim().charAt(0).toUpperCase() || "?"}
              </div>
            )}

            <h1 className="text-[13px] font-bold text-gray-900 text-center leading-tight">
              {locationName || " "}
            </h1>



            {mOrder.map((modId) => {
              if (modId.startsWith("link:")) {
                const idx = parseInt(modId.substring(5), 10);
                const link = links[idx];
                if (!link || link.title.trim().length === 0) return null;
                return (
                  <div
                    key={modId}
                    className={`w-full mt-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full font-medium text-[11px] ${getTileBackground(link.background).tile}`}
                  >
                    <LinkIconGlyph icon={link.icon} className="w-3 h-3 shrink-0" />
                    <span className="truncate">{link.title}</span>
                  </div>
                );
              }
              if (modId === "review") {
                return (
                  <div key="review" className="w-full mt-1">
                    <div className="block w-full text-center py-2 px-3 rounded-full bg-blue-600 font-semibold text-white text-[11px]">
                      {reviewShowStar && "⭐ "}{reviewBannerText || t("leave_review", previewLang)}
                    </div>
                  </div>
                );
              }
              if (modId === "promo" && hasPromo) {
                return (
                  <div key="promo" className="w-full mt-1">
                    <div className="block w-full text-center py-2 px-3 rounded-full bg-amber-400 font-semibold text-gray-900 text-[11px]">
                      {promoBannerText || t("collect_promo_default", previewLang)}
                    </div>
                  </div>
                );
              }
              if (modId === "wifi" && hasWifi) {
                return (
                  <div key="wifi" className="w-full mt-1">
                    <div className="block w-full text-center py-2 px-3 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200 font-semibold text-[11px]">
                      {wifiBannerText || t("portal_tab_wifi", previewLang)}
                    </div>
                  </div>
                );
              }
              if (modId === "loyalty" && hasLoyalty) {
                return (
                  <div key="loyalty" className="w-full mt-1">
                    <div className="block w-full text-center py-2 px-3 rounded-full bg-gray-900 font-semibold text-white text-[11px]">
                      {loyaltyBannerText || t("loyalty_card_link", previewLang)}
                    </div>
                  </div>
                );
              }
              if (modId === "menu" && hasMenu) {
                return (
                  <div key="menu" className="w-full mt-1">
                    <div className="block w-full text-center py-2 px-3 rounded-full bg-emerald-500 font-semibold text-white text-[11px]">
                      {menuBannerText || t("portal_tab_menu", previewLang)}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-center">
        {t("portal_linktree_preview_hint", lang)}
      </p>
    </div>
  );
}
