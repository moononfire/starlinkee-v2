import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getAllReviewsBySubscription } from "@/lib/db/portal";
import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import ReviewsAnalytics from "./ReviewsAnalytics";
import { getLanguage } from "@/lib/language";

interface Props {
  params: Promise<{ subscriptionId: string }>;
  searchParams: Promise<{ stars?: string; scrollTo?: string }>;
}

export default async function ReviewsPage({ params, searchParams }: Props) {
  const { subscriptionId: rawId } = await params;
  const { stars, scrollTo } = await searchParams;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  const lang = await getLanguage();
  const [reviews, plates] = await Promise.all([
    getAllReviewsBySubscription(subscriptionId),
    getPlatesBySubscriptionId(subscriptionId),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://starlinkee.com";
  const plate = plates[0];
  const plateScanUrl = plate ? `${appUrl}/plate/${plate.plate_number}/${plate.secret_key}` : null;

  const totalCount = reviews.length;
  const avgRating = totalCount > 0
    ? Math.round((reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / totalCount) * 100) / 100
    : null;

  const byStars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    if (r.rating) byStars[r.rating] = (byStars[r.rating] ?? 0) + 1;
  }

  return (
    <ReviewsAnalytics
      subscriptionId={subscriptionId}
      location={sub.location}
      plateScanUrl={plateScanUrl}
      reviews={reviews}
      totalCount={totalCount}
      avgRating={avgRating}
      byStars={byStars}
      initialStars={stars ? Number(stars) : undefined}
      scrollTo={scrollTo}
      lang={lang}
    />
  );
}
