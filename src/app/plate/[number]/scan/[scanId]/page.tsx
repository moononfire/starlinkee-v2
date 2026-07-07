import { notFound, redirect } from "next/navigation";
import { getReviewByScanId } from "@/lib/db/reviews";
import { getPlateByNumber } from "@/lib/db/plates";
import { getLocationBySubscriptionId } from "@/lib/db/locations";
import { getSubscriptionById } from "@/lib/db/subscriptions";
import { t } from "@/lib/translations";
import RatingStars from "@/components/plate/RatingStars";
import FeedbackForm from "@/components/plate/FeedbackForm";
import PageTracker from "@/components/tracking/PageTracker";
import { getLanguage } from "@/lib/language";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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

  const lang = await getLanguage(plate.plate_number, plate.plate_language);

  // Rating already recorded for this scan — never show the star picker again,
  // otherwise a refresh lets a dissatisfied visitor re-roll a 5-star rating
  // straight to Google without physically rescanning the plate.
  if (review.rating !== null) {
    if (review.feedback_time !== null) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
          <div className="max-w-sm w-full flex flex-col items-center gap-2 text-center">
            <p className="text-lg font-semibold text-gray-800">{t("thank_you_short", lang)}</p>
            <p className="text-gray-500">{t("appreciate_feedback", lang)}</p>
          </div>
        </main>
      );
    }

    const shouldRedirect =
      review.rating === 5 || (review.rating === 4 && location.redirect_four_star_reviews);
    if (shouldRedirect && location.google_review_link) {
      redirect(location.google_review_link);
    }
  }

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/plate/${number}/scan`} pageType="plate_scan" />
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
        <div className="max-w-sm w-full flex flex-col items-center gap-6">
          <LanguageSwitcher currentLang={lang} scopeKey={plate.plate_number} />

          {location.logo_link && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={location.logo_link}
              alt={location.location_name}
              className="h-24 w-24 object-cover rounded-full"
            />
          )}

          <h2 className="text-lg font-bold text-gray-900 text-center">
            {location.location_name}
          </h2>

          <h1 className="text-xl font-semibold text-gray-800 text-center">
            {t("proxy_page_title", lang)}
          </h1>

          {review.rating !== null ? (
            <FeedbackForm scanId={scanId} lang={lang} />
          ) : (
            <RatingStars
              scanId={scanId}
              googleReviewLink={location.google_review_link ?? ""}
              lang={lang}
            />
          )}
        </div>
      </main>
    </>
  );
}
