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
  lang: string;
}

export default function LinktreePreview({
  locationName,
  logoUrl,
  links,
  pageBackground,
  hasPromo,
  promoBannerText,
  hasLoyalty,
  lang,
}: Props) {
  const visibleLinks = links.filter((l) => l.url.trim().length > 0 && l.title.trim().length > 0);

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

            <div className="w-full flex flex-col gap-2">
              <div className="w-full text-center py-2 px-3 rounded-full bg-blue-600 font-semibold text-white text-[11px]">
                ⭐ {t("leave_review", lang)}
              </div>

              {visibleLinks.length === 0 && (
                <p className="text-[10px] text-gray-300 text-center py-2">···</p>
              )}

              {visibleLinks.map((link, i) => (
                <div
                  key={i}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-full font-medium text-[11px] ${getTileBackground(link.background).tile}`}
                >
                  <LinkIconGlyph icon={link.icon} className="w-3 h-3 shrink-0" />
                  <span className="truncate">{link.title}</span>
                </div>
              ))}
            </div>

            {hasPromo && (
              <div className="w-full mt-1">
                <div className="block w-full text-center py-2 px-3 rounded-full bg-amber-400 font-semibold text-gray-900 text-[11px]">
                  {promoBannerText || t("collect_promo_default", lang)}
                </div>
              </div>
            )}

            {hasLoyalty && (
              <div className="w-full">
                <div className="block w-full text-center py-2 px-3 rounded-full bg-gray-900 font-semibold text-white text-[11px]">
                  {t("loyalty_card_link", lang)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-center">
        {t("portal_linktree_preview_hint", lang)}
      </p>
    </div>
  );
}
