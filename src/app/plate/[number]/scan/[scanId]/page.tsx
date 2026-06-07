import { notFound } from "next/navigation";
import { getReviewByScanId } from "@/lib/db/reviews";
import { getPlateByNumber, incrementPlateVisits } from "@/lib/db/plates";
import { getLocationBySubscriptionId } from "@/lib/db/locations";
import { getSubscriptionById } from "@/lib/db/subscriptions";
import { t } from "@/lib/translations";
import RatingStars from "@/components/plate/RatingStars";

interface Props {
  params: Promise<{ number: string; scanId: string }>;
}

export default async function ScanPage({ params }: Props) {
  const { number, scanId } = await params;

  const review = await getReviewByScanId(scanId);
  if (!review) notFound();

  const plate = await getPlateByNumber(number);
  if (!plate || plate.plate_id !== review.plate_id) notFound();

  if (!plate.subscription_id) notFound();
  const subscription = await getSubscriptionById(plate.subscription_id);
  if (!subscription || subscription.status !== "active") notFound();

  const location = await getLocationBySubscriptionId(plate.subscription_id);
  if (!location) notFound();

  // Increment visit count (fire and forget — non-blocking)
  incrementPlateVisits(plate.plate_id).catch(() => {});

  const lang = plate.plate_language;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="max-w-sm w-full flex flex-col items-center gap-6">
        {location.logo_link && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={location.logo_link}
            alt={location.location_name}
            className="h-24 w-auto object-contain"
          />
        )}

        <h1 className="text-xl font-semibold text-gray-800 text-center">
          {t("proxy_page_title", lang)}
        </h1>

        <RatingStars
          scanId={scanId}
          googleReviewLink={location.google_review_link ?? ""}
          lang={lang}
        />
      </div>
    </main>
  );
}
