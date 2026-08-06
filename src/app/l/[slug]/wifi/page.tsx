import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocationBySlug } from "@/lib/db/locations";
import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import WifiWidget from "@/components/linktree/WifiWidget";
import PageTracker from "@/components/tracking/PageTracker";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getPageBackground } from "@/lib/pageBackgrounds";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scan?: string }>;
}

export default async function WifiPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { scan } = await searchParams;

  const location = await getLocationBySlug(slug);
  if (!location || !location.has_wifi_enabled || !location.wifi_ssid) notFound();

  const plates = await getPlatesBySubscriptionId(location.subscription_id);
  const plateLanguage = plates[0]?.plate_language ?? "pl";
  const lang = await getLanguage(slug, plateLanguage, location.active_languages);

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/l/${slug}/wifi`} pageType="linktree" />
      <main className={`min-h-screen flex flex-col items-center pt-4 px-4 ${getPageBackground(location.page_background).page}`}>
        <div className="flex items-center justify-between w-full max-w-sm mb-3">
          <Link
            href={`/l/${slug}${scan ? `?scan=${encodeURIComponent(scan)}` : ""}`}
            className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-700 dark:text-gray-200 dark:hover:text-gray-100 transition-colors"
          >
            ← {t("back_button", lang)}
          </Link>
          <LanguageSwitcher currentLang={lang} scopeKey={slug} availableLanguages={location.active_languages} />
        </div>
        <div className="w-full max-w-sm">
          {location.logo_link && (
            <img
              src={location.logo_link}
              alt={location.location_name}
              className={`w-16 h-16 object-cover mx-auto mb-4 ${
                location.logo_is_round ? "rounded-full" : "rounded-xl"
              }`}
            />
          )}
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-6">
            {location.location_name}
          </h1>

          <WifiWidget ssid={location.wifi_ssid} password={location.wifi_password || ""} lang={lang} />
        </div>
      </main>
    </>
  );
}
