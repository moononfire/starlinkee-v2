import { notFound } from "next/navigation";
import { getLocationBySlug } from "@/lib/db/locations";
import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import { getLoyaltyCard } from "@/lib/db/loyalty";
import { getLoyaltySession } from "@/lib/session";
import LoyaltyCard from "@/components/linktree/LoyaltyCard";
import PageTracker from "@/components/tracking/PageTracker";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scan?: string }>;
}

export default async function LoyaltyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { scan } = await searchParams;

  const location = await getLocationBySlug(slug);
  if (!location || !location.has_loyalty_enabled) notFound();

  const [session, plates] = await Promise.all([
    getLoyaltySession(),
    getPlatesBySubscriptionId(location.subscription_id),
  ]);
  const isAuthenticated =
    !!session.phone && session.locationId === location.location_id;

  let initialStamps: number | null = null;
  if (isAuthenticated) {
    const card = await getLoyaltyCard(location.location_id, session.phone!);
    initialStamps = card?.stamps_count ?? 0;
  }

  const plateLanguage = plates[0]?.plate_language ?? "pl";
  const lang = await getLanguage(slug, plateLanguage, location.active_languages);

  const maxStamps = location.loyalty_stamps_required ?? 10;
  const customText =
    lang === "en"
      ? location.loyalty_card_text_en || location.loyalty_card_text || location.loyalty_card_text_de
      : lang === "de"
        ? location.loyalty_card_text_de || location.loyalty_card_text || location.loyalty_card_text_en
        : location.loyalty_card_text || location.loyalty_card_text_en || location.loyalty_card_text_de;
  const subtitle = customText?.trim() || t("loyalty_program", lang);

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/l/${slug}/loyalty`} pageType="loyalty" />
      <main className="min-h-screen bg-gray-50 flex flex-col items-center pt-4 px-4">
        <div className="flex justify-end w-full max-w-sm mb-3">
          <LanguageSwitcher currentLang={lang} scopeKey={slug} availableLanguages={location.active_languages} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          {location.logo_link && (
            <img
              src={location.logo_link}
              alt={location.location_name}
              className="w-16 h-16 object-contain rounded-xl mx-auto mb-4"
            />
          )}
          <h1 className="text-xl font-semibold text-center mb-1">{location.location_name}</h1>
          <p className="text-sm text-gray-500 text-center mb-8">{subtitle}</p>

          <LoyaltyCard
            slug={slug}
            scanToken={scan}
            initialStamps={initialStamps}
            isAuthenticated={isAuthenticated}
            maxStamps={maxStamps}
            lang={lang}
          />
        </div>
      </main>
    </>
  );
}
