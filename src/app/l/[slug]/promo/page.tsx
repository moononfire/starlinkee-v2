import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocationBySlug } from "@/lib/db/locations";
import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import PromoForm from "@/components/linktree/PromoForm";
import PageTracker from "@/components/tracking/PageTracker";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import { getPromoText } from "@/lib/promo-i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scan?: string }>;
}

export default async function PromoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { scan } = await searchParams;

  const location = await getLocationBySlug(slug);
  if (!location || !location.has_promo_enabled) notFound();

  const plates = await getPlatesBySubscriptionId(location.subscription_id);
  const plateLanguage = plates[0]?.plate_language ?? "pl";
  const lang = await getLanguage(slug, plateLanguage, location.active_languages);

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/l/${slug}/promo`} pageType="promo" />
      <main className="min-h-screen bg-gray-50 flex flex-col items-center pt-4 px-4">
        <div className="flex items-center justify-between w-full max-w-sm mb-3">
          <Link
            href={`/l/${slug}${scan ? `?scan=${encodeURIComponent(scan)}` : ""}`}
            className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← {t("back_button", lang)}
          </Link>
          <LanguageSwitcher currentLang={lang} scopeKey={slug} availableLanguages={location.active_languages} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          {location.logo_link && (
            <img
              src={location.logo_link}
              alt={location.location_name}
              className="w-16 h-16 object-cover rounded-full mx-auto mb-4"
            />
          )}
          <h1 className="text-xl font-semibold text-gray-800 text-center mb-1">{location.location_name}</h1>
          <p className="text-sm text-gray-500 text-center mb-8">{getPromoText(location, lang, "promo_description") || t("collect_your_promo", lang)}</p>

          <PromoForm slug={slug} bannerText={getPromoText(location, lang, "promo_banner_text")} scanToken={scan} lang={lang} />
        </div>
      </main>
    </>
  );
}
