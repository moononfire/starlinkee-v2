import { notFound, redirect } from "next/navigation";
import { getReviewByScanId } from "@/lib/db/reviews";
import { listMessagesByReviewId } from "@/lib/db/review-messages";
import { getPlateByNumber } from "@/lib/db/plates";
import { getLocationBySubscriptionId } from "@/lib/db/locations";
import { getSubscriptionById } from "@/lib/db/subscriptions";
import { t } from "@/lib/translations";
import RatingStars from "@/components/plate/RatingStars";
import FeedbackForm from "@/components/plate/FeedbackForm";
import ReviewConversation from "@/components/plate/ReviewConversation";
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

  // Subscription lapsed after this scan session started (or was never active) —
  // send the customer to the plate's permanent URL, which already shows the
  // renewal screen with a payment link tied to this exact subscription.
  if (!plate.subscription_id) redirect(`/plate/${plate.plate_number}/${plate.secret_key}`);
  const subscription = await getSubscriptionById(plate.subscription_id);
  if (!subscription || subscription.status !== "active") {
    redirect(`/plate/${plate.plate_number}/${plate.secret_key}`);
  }

  const location = await getLocationBySubscriptionId(plate.subscription_id);
  if (!location) notFound();

  const lang = await getLanguage(plate.plate_number, plate.plate_language, location.active_languages);

  // Feedback already submitted for this scan — show the conversation thread
  // instead of the rating/contact flow again.
  if (review.rating !== null && review.feedback_time !== null) {
    const messages = await listMessagesByReviewId(review.review_id);
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
        <div className="max-w-sm w-full flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800">{t("thank_you_short", lang)}</p>
            <p className="text-gray-500">{t("appreciate_feedback", lang)}</p>
          </div>
          <ReviewConversation scanId={scanId} lang={lang} initialMessages={messages} />
        </div>
      </main>
    );
  }

  // Rating submitted but no feedback yet (e.g. came back from Google or closed tab).
  // Don't show stars again to prevent 409 conflict, unless it's the test plate.
  if (review.rating !== null && plate.plate_number !== "TJRUAO") {
    return (
      <>
        <PageTracker locationId={location.location_id} pagePath={`/plate/${number}/scan`} pageType="plate_scan" />
        <main className="min-h-screen flex flex-col p-6 bg-white">
          <div className="flex justify-end w-full max-w-sm mx-auto mb-3 shrink-0">
            <LanguageSwitcher currentLang={lang} scopeKey={plate.plate_number} availableLanguages={location.active_languages} />
          </div>
          
          <div className="max-w-sm w-full mx-auto flex flex-col items-center gap-6 my-auto pb-8">
            {location.logo_link && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={location.logo_link}
                alt={location.location_name}
                className={
                  location.logo_is_round
                    ? "h-24 w-24 object-cover rounded-full"
                    : "max-h-24 w-auto object-contain rounded-lg"
                }
              />
            )}
            <h2 className="text-lg font-bold text-gray-900 text-center">
              {location.location_name}
            </h2>
            <FeedbackForm scanId={scanId} lang={lang} />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/plate/${number}/scan`} pageType="plate_scan" />
      <main className="min-h-screen flex flex-col p-6 bg-white">
        <div className="flex justify-end w-full max-w-sm mx-auto mb-3 shrink-0">
          <LanguageSwitcher currentLang={lang} scopeKey={plate.plate_number} availableLanguages={location.active_languages} />
        </div>
        
        <div className="max-w-sm w-full mx-auto flex flex-col items-center gap-6 my-auto pb-8">

          {location.logo_link && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={location.logo_link}
              alt={location.location_name}
              className={
                location.logo_is_round
                  ? "h-24 w-24 object-cover rounded-full"
                  : "max-h-24 w-auto object-contain rounded-lg"
              }
            />
          )}

          <h2 className="text-lg font-bold text-gray-900 text-center">
            {location.location_name}
          </h2>

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
    </>
  );
}
