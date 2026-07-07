import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getLocationBySlug } from "@/lib/db/locations";
import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import { createScanRecord } from "@/lib/db/reviews";
import RatingStars from "@/components/plate/RatingStars";
import PageTracker from "@/components/tracking/PageTracker";
import { getLanguage } from "@/lib/language";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LinktreeReviewPage({ params }: Props) {
  const { slug } = await params;

  const location = await getLocationBySlug(slug);
  if (!location) notFound();

  const plates = await getPlatesBySubscriptionId(location.subscription_id);
  if (plates.length === 0) notFound();

  const plate = plates[0];
  const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? null;
  const userAgent = headersList.get("user-agent") ?? null;
  const deviceId = cookieStore.get("_did")?.value ?? null;
  const scanId = await createScanRecord(plate.plate_id, { ip_address: ip, user_agent: userAgent, device_id: deviceId });
  const lang = await getLanguage(slug, plate.plate_language);

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/l/${slug}/review`} pageType="review" />
      <main className="min-h-screen flex flex-col items-center p-6 bg-white">
        <div className="flex justify-end w-full max-w-sm mb-3">
          <LanguageSwitcher currentLang={lang} scopeKey={slug} />
        </div>
        <div className="max-w-sm w-full flex flex-col items-center gap-6 flex-1 justify-center">

          {location.logo_link && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={location.logo_link}
              alt={location.location_name}
              className="h-24 w-24 object-cover rounded-full"
            />
          )}

          <h1 className="text-xl font-semibold text-gray-800 text-center">
            {location.location_name}
          </h1>

          <RatingStars
            scanId={scanId}
            googleReviewLink={location.google_review_link ?? ""}
            lang={lang}
          />
        </div>
      </main>
    </>
  );
}
