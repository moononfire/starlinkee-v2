import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalSession } from "@/lib/portal-session";
import {
  getScanCountsBySubscription,
  getAllReviewsBySubscription,
} from "@/lib/db/portal";
import type { Review } from "@/lib/types";
import PortalSetupForm from "../settings/PortalSetupForm";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";

interface Props {
  params: Promise<{ subscriptionId: string }>;
}

const DATE_LOCALES: Record<string, string> = { en: "en-US", de: "de-DE", pl: "pl-PL" };

function formatDate(d: string | null, lang: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(DATE_LOCALES[lang] ?? "en-US");
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export default async function SubscriptionPage({ params }: Props) {
  const { subscriptionId: rawId } = await params;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  const lang = await getLanguage();
  const { total: totalScans, byPlate: scansByPlate } =
    await getScanCountsBySubscription(subscriptionId);

  // --- PENDING ---
  if (sub.status === "pending") {
    return (
      <div className="space-y-6">
        <SubscriptionStats sub={sub} totalScans={totalScans} scansByPlate={scansByPlate} lang={lang} />
        <PortalSetupForm subscriptionId={sub.subscription_id} lang={lang} />
      </div>
    );
  }

  // --- INACTIVE ---
  if (sub.status === "inactive") {
    return (
      <div className="space-y-6">
        <SubscriptionStats sub={sub} totalScans={totalScans} scansByPlate={scansByPlate} lang={lang} />

        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-5">
          <div className="flex gap-3">
            <svg
              className="shrink-0 w-5 h-5 text-red-500 dark:text-red-400 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-300">
                {t("portal_subscription_inactive_title", lang)}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {t("portal_subscription_inactive_message", lang)}
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                {t("portal_contact_to_renew", lang)}{" "}
                <a
                  href="mailto:kontakt@starlinkee.pl"
                  className="underline font-medium hover:text-red-900 dark:hover:text-red-200 transition-colors"
                >
                  kontakt@starlinkee.pl
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ACTIVE ---
  const allReviews = await getAllReviewsBySubscription(subscriptionId);
  const reviewTotal = allReviews.length;
  const reviewAvg = reviewTotal > 0
    ? Math.round((allReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviewTotal) * 100) / 100
    : null;
  const reviewByStars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of allReviews) { if (r.rating) reviewByStars[r.rating]++; }
  const recentReviews = allReviews.slice(0, 10);

  return (
    <div className="space-y-6">
      <SubscriptionStats sub={sub} totalScans={totalScans} scansByPlate={scansByPlate} lang={lang} />
      <ReviewStats total={reviewTotal} avg={reviewAvg} byStars={reviewByStars} subscriptionId={subscriptionId} lang={lang} />
      <ReviewsSection reviews={recentReviews} subscriptionId={subscriptionId} lang={lang} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function ReviewStats({
  total,
  avg,
  byStars,
  subscriptionId,
  lang,
}: {
  total: number;
  avg: number | null;
  byStars: Record<number, number>;
  subscriptionId: number;
  lang: string;
}) {
  const STAR_COLORS: Record<number, string> = {
    1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#84cc16", 5: "#22c55e",
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t("portal_google_reviews", lang)}</h3>
        <Link
          href={`/portal/${subscriptionId}/reviews`}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t("portal_details_link", lang)} →
        </Link>
      </div>
      {total === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {t("portal_no_reviews_yet", lang)}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_total", lang)}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_average", lang)}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {avg !== null ? avg.toFixed(2) : "—"}
                <span className="text-sm font-normal text-amber-500 ml-1">★</span>
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = byStars[star] ?? 0;
              const pct = (count / total) * 100;
              return (
                <Link
                  key={star}
                  href={`/portal/${subscriptionId}/reviews?stars=${star}`}
                  className="flex items-center gap-2 text-xs group"
                >
                  <span className="w-[4.5rem] shrink-0 text-amber-500 group-hover:text-amber-600 transition-colors">
                    {"★".repeat(star)}{"☆".repeat(5 - star)}
                  </span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: STAR_COLORS[star] }}
                    />
                  </div>
                  <span className="w-6 text-right text-gray-400 dark:text-gray-500">{count}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function SubscriptionStats({
  sub,
  totalScans,
  scansByPlate,
  lang,
}: {
  sub: {
    plates: { plate_id: number; plate_number: string; number_of_visits: number }[];
    activation_datetime: string | null;
    expiration_datetime: string | null;
  };
  totalScans: number;
  scansByPlate: Record<number, number>;
  lang: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_plates", lang)}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {sub.plates.length}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_scans", lang)}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {totalScans}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_activation", lang)}</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {formatDate(sub.activation_datetime, lang)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_valid_until", lang)}</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {formatDate(sub.expiration_datetime, lang)}
          </p>
        </div>
      </div>

      {sub.plates.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {t("portal_plate_numbers", lang)}
          </p>
          <div className="flex flex-wrap gap-2">
            {sub.plates.map((plate) => (
              <div
                key={plate.plate_id}
                className="bg-gray-50 dark:bg-gray-700 rounded px-3 py-1.5 text-sm"
              >
                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                  {plate.plate_number}
                </span>
                <span className="text-gray-400 dark:text-gray-500 ml-2">
                  {scansByPlate[plate.plate_id] ?? 0} {t("portal_scan_suffix", lang)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewsSection({
  reviews,
  subscriptionId,
  lang,
}: {
  reviews: (Review & { plate_number: string })[];
  subscriptionId: number;
  lang: string;
}) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t("portal_recent_reviews", lang)}
        </h3>
        <Link
          href={`/portal/${subscriptionId}/reviews`}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t("portal_all_reviews", lang)} →
        </Link>
      </div>

      {reviews.length === 0 && (
        <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500">
          {t("portal_no_reviews_yet", lang)}
        </p>
      )}
      {reviews.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t("portal_date", lang)}</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t("portal_plate", lang)}</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t("portal_rating", lang)}</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">{t("portal_comment", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.review_id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {formatDate(review.rating_time ?? review.created_at, lang)}
                </td>
                <td className="px-5 py-3 font-mono text-gray-900 dark:text-gray-100">
                  {review.plate_number}
                </td>
                <td className="px-5 py-3">
                  {review.rating ? <Stars rating={review.rating} /> : "—"}
                </td>
                <td className="px-5 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate hidden sm:table-cell">
                  {review.feedback_message ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
