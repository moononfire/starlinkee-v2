import Link from "next/link";
import type { CustomerLocation, CustomerLocationLink } from "@/lib/types";
import { t } from "@/lib/translations";
import { isSafeHttpUrl } from "@/lib/urls";
import { LinkIconGlyph } from "@/lib/linkIcons";
import { getTileBackground } from "@/lib/linkBackgrounds";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
    <main className="min-h-screen flex flex-col items-center p-6 bg-white">
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
          <Link
            href={`/l/${slug}/review`}
            className="w-full text-center py-3 px-6 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold text-white transition-colors"
          >
            ⭐ {t("leave_review", lang)}
          </Link>
          {links.filter((link) => isSafeHttpUrl(link.url)).map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full font-medium hover:opacity-90 transition-opacity ${getTileBackground(link.background).tile}`}
            >
              <LinkIconGlyph icon={link.icon} className="w-4 h-4 shrink-0" />
              {getLinkTitle(link, lang)}
            </a>
          ))}
        </div>

        {location.has_promo_enabled && (
          <div className="w-full mt-2">
            <Link
              href={`/l/${slug}/promo${scanToken ? `?scan=${scanToken}` : ""}`}
              className="block w-full text-center py-3 px-6 rounded-full bg-amber-400 hover:bg-amber-500 font-semibold text-gray-900 transition-colors"
            >
              {location.promo_banner_text ?? t("collect_promo_default", lang)}
            </Link>
          </div>
        )}

        {location.has_loyalty_enabled && (
          <div className="w-full">
            <Link
              href={`/l/${slug}/loyalty${scanToken ? `?scan=${scanToken}` : ""}`}
              className="block w-full text-center py-3 px-6 rounded-full bg-gray-900 hover:bg-gray-700 font-semibold text-white transition-colors"
            >
              {t("loyalty_card_link", lang)}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
