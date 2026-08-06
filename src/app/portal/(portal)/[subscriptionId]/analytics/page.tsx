import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getAllReviewsBySubscription } from "@/lib/db/portal";
import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import { getLanguage } from "@/lib/language";
import DashboardAnalytics from "../DashboardAnalytics";

interface Props {
  params: Promise<{ subscriptionId: string }>;
  searchParams: Promise<{ stars?: string; scrollTo?: string }>;
}

export default async function AnalyticsPage({ params, searchParams }: Props) {
  const { subscriptionId: rawId } = await params;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub || sub.status !== "active") notFound();

  const lang = await getLanguage();
  const allReviews = await getAllReviewsBySubscription(subscriptionId);
  const plates = await getPlatesBySubscriptionId(subscriptionId);
  const { stars, scrollTo } = await searchParams;
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://starlinkee.com";
  const plate = plates[0];
  const plateScanUrl = plate ? `${appUrl}/plate/${plate.plate_number}/${plate.secret_key}` : null;
  
  const reviewTotal = allReviews.length;
  const reviewAvg = reviewTotal > 0
    ? Math.round((allReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviewTotal) * 100) / 100
    : null;
  const reviewByStars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of allReviews) { if (r.rating) reviewByStars[r.rating]++; }

  return (
    <DashboardAnalytics
      subscriptionId={subscriptionId}
      location={sub.location}
      plateScanUrl={plateScanUrl}
      reviews={allReviews}
      totalCount={reviewTotal}
      avgRating={reviewAvg}
      byStars={reviewByStars}
      initialStars={stars ? Number(stars) : undefined}
      scrollTo={scrollTo}
      lang={lang}
    />
  );
}
