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
}

export default async function LoyaltyPage({ params }: Props) {
  const { slug } = await params;

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
  const lang = await getLanguage(plateLanguage);

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/l/${slug}/loyalty`} pageType="loyalty" />
      <main className="min-h-screen bg-gray-50 flex flex-col items-center pt-4 px-4">
        <div className="flex justify-end w-full max-w-sm mb-3">
          <LanguageSwitcher currentLang={lang} />
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
          <p className="text-sm text-gray-500 text-center mb-8">{t("loyalty_program", lang)}</p>

          <LoyaltyCard
            slug={slug}
            initialStamps={initialStamps}
            isAuthenticated={isAuthenticated}
            lang={lang}
          />
        </div>
      </main>
    </>
  );
}
