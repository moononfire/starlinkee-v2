import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";
import { getCustomerByEmail, getCustomerSubscriptions, getAllReviewsBySubscription } from "@/lib/db/portal";
import ReviewsAnalytics from "./ReviewsAnalytics";

interface Props {
  params: Promise<{ subscriptionId: string }>;
  searchParams: Promise<{ stars?: string }>;
}

export default async function ReviewsPage({ params, searchParams }: Props) {
  const { subscriptionId: rawId } = await params;
  const { stars } = await searchParams;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  const reviews = await getAllReviewsBySubscription(subscriptionId);

  const totalCount = reviews.length;
  const avgRating = totalCount > 0
    ? Math.round((reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / totalCount) * 100) / 100
    : null;

  const byStars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    if (r.rating) byStars[r.rating] = (byStars[r.rating] ?? 0) + 1;
  }

  const locationName = sub.location?.location_name ?? sub.subscription_name;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/portal/${subscriptionId}`}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          ← {locationName}
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Wszystkie opinie</h2>
      </div>

      <ReviewsAnalytics
        reviews={reviews}
        totalCount={totalCount}
        avgRating={avgRating}
        byStars={byStars}
        initialStars={stars ? Number(stars) : undefined}
      />
    </div>
  );
}
