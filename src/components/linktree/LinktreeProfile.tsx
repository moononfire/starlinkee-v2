import Link from "next/link";
import type { CustomerLocation, CustomerLocationLink } from "@/lib/types";
import { t } from "@/lib/translations";
import { isSafeHttpUrl } from "@/lib/urls";
import { LinkIconGlyph } from "@/lib/linkIcons";
import { getTileBackground } from "@/lib/linkBackgrounds";
import { getPageBackground } from "@/lib/pageBackgrounds";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getModuleText } from "@/lib/promo-i18n";

interface Props {
  location: CustomerLocation;
  links: CustomerLocationLink[];
  slug: string;
  scanToken?: string;
  lang: string;
}

function getLinkTitle(link: CustomerLocationLink, lang: string): string {
  if (lang === "pl") return link.title_pl || link.title_en || link.title_de || link.title;
  if (lang === "en") return link.title_en || link.title_pl || link.title_de || link.title;
  if (lang === "de") return link.title_de || link.title_pl || link.title_en || link.title;
  return link.title;
}

export default function LinktreeProfile({ location, links, slug, scanToken, lang }: Props) {
  return (
    <main className={`min-h-screen flex flex-col items-center p-6 ${getPageBackground(location.page_background).page}`}>
      <div className="flex justify-end w-full max-w-sm mb-3">
        <LanguageSwitcher currentLang={lang} scopeKey={slug} availableLanguages={location.active_languages} />
      </div>
      <div className="max-w-sm w-full flex flex-col items-center gap-6">

        {location.logo_link && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={location.logo_link}
            alt={location.location_name}
            className="h-24 w-24 object-cover rounded-full"
          />
        )}

        <h1 className="text-2xl font-bold text-gray-900 text-center">
          {location.location_name}
        </h1>

        <div className="w-full flex flex-col gap-3">
          {(() => {
            let order = location.module_order ?? ["review", "promo", "loyalty", "wifi", "menu"];
            if (!order.includes("review")) order = ["review", ...order];
            if (!order.includes("menu")) order = [...order, "menu"];
            return order;
          })().map((modId) => {
            if (modId.startsWith("link:")) {
              const idx = parseInt(modId.substring(5), 10);
              const sortedLinks = [...links].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
              const link = sortedLinks[idx];
              if (!link || !isSafeHttpUrl(link.url)) return null;
              return (
                <a
                  key={modId}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full font-medium hover:opacity-90 transition-opacity ${getTileBackground(link.background).tile}`}
                >
                  <LinkIconGlyph icon={link.icon} className="w-4 h-4 shrink-0" />
                  {getLinkTitle(link, lang)}
                </a>
              );
            }
            if (modId === "review") {
              return (
                <div key="review" className="w-full">
                  <Link
                    href={`/l/${slug}/review`}
                    className="block w-full text-center py-3 px-6 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold text-white transition-colors"
                  >
                    {(location.review_show_star ?? true) && "⭐ "}{getModuleText(location, lang, "review_banner_text") || t("leave_review", lang)}
                  </Link>
                </div>
              );
            }
            if (modId === "promo" && location.has_promo_enabled) {
              return (
                <div key="promo" className="w-full">
                  <Link
                    href={`/l/${slug}/promo${scanToken ? `?scan=${scanToken}` : ""}`}
                    className="block w-full text-center py-3 px-6 rounded-full bg-amber-400 hover:bg-amber-500 font-semibold text-gray-900 transition-colors"
                  >
                    {getModuleText(location, lang, "promo_banner_text") || t("collect_promo_default", lang)}
                  </Link>
                </div>
              );
            }
            if (modId === "wifi" && location.has_wifi_enabled && location.wifi_ssid) {
              return (
                <div key="wifi" className="w-full">
                  <Link
                    href={`/l/${slug}/wifi${scanToken ? `?scan=${scanToken}` : ""}`}
                    className="block w-full text-center py-3 px-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-900 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-200 font-semibold transition-colors"
                  >
                    {getModuleText(location, lang, "wifi_banner_text") || t("portal_tab_wifi", lang)}
                  </Link>
                </div>
              );
            }
            if (modId === "loyalty" && location.has_loyalty_enabled) {
              return (
                <div key="loyalty" className="w-full">
                  <Link
                    href={`/l/${slug}/loyalty${scanToken ? `?scan=${scanToken}` : ""}`}
                    className="block w-full text-center py-3 px-6 rounded-full bg-gray-900 hover:bg-gray-700 font-semibold text-white transition-colors"
                  >
                    {getModuleText(location, lang, "loyalty_banner_text") || t("loyalty_card_link", lang)}
                  </Link>
                </div>
              );
            }
            if (modId === "menu" && location.has_menu_enabled) {
              return (
                <div key="menu" className="w-full">
                  <Link
                    href={`/l/${slug}/menu${scanToken ? `?scan=${scanToken}` : ""}`}
                    className="block w-full text-center py-3 px-6 rounded-full bg-emerald-500 hover:bg-emerald-600 font-semibold text-white transition-colors"
                  >
                    {getModuleText(location, lang, "menu_banner_text") || t("portal_tab_menu", lang)}
                  </Link>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </main>
  );
}
