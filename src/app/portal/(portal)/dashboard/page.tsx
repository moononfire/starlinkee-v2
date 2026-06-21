import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import {
  getCustomerByEmail,
  getCustomerSubscriptions,
  getCustomerReviews,
} from "@/lib/db/portal";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    inactive:
      "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? colors.inactive}`}
    >
      {status}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500">
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pl-PL");
}

export default async function PortalDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const [subscriptions, reviews] = await Promise.all([
    getCustomerSubscriptions(customer.customer_id),
    getCustomerReviews(customer.customer_id, 10),
  ]);

  const totalPlates = subscriptions.reduce(
    (sum, s) => sum + s.plates.length,
    0
  );
  const totalScans = subscriptions.reduce(
    (sum, s) => sum + s.plates.reduce((ps, p) => ps + p.number_of_visits, 0),
    0
  );
  const activeCount = subscriptions.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Witaj, {customer.customer_name}
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Aktywne usługi", value: activeCount },
          { label: "Płytki", value: totalPlates },
          { label: "Skanowania", value: totalScans },
          { label: "Oceny", value: reviews.length },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Subscriptions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Subskrypcje
        </h2>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Brak subskrypcji.
          </p>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.subscription_id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {sub.subscription_name}
                  </h3>
                  <StatusBadge status={sub.status} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Aktywacja
                    </p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {formatDate(sub.activation_datetime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Wygaśnięcie
                    </p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {formatDate(sub.expiration_datetime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Płytki</p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {sub.plates.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Czas trwania
                    </p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {sub.duration_in_days} dni
                    </p>
                  </div>
                </div>

                {/* Location info */}
                {sub.location && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Lokalizacja
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {sub.location.location_name}
                        </p>
                        {sub.location.city && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {sub.location.city}
                            {sub.location.country
                              ? `, ${sub.location.country}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-gray-500 dark:text-gray-400">
                          Wizyty linktree
                        </p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {sub.location.linktree_visits}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Plates */}
                {sub.plates.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Płytki
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
                            {plate.number_of_visits} skanowań
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Reviews */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Ostatnie opinie
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Brak opinii.
          </p>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">
                    Data
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">
                    Płytka
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">
                    Ocena
                  </th>
                  <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">
                    Komentarz
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr
                    key={review.review_id}
                    className="border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                  >
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {formatDate(review.rating_time ?? review.created_at)}
                    </td>
                    <td className="px-5 py-3 font-mono text-gray-900 dark:text-gray-100">
                      {review.plate_number}
                    </td>
                    <td className="px-5 py-3">
                      {review.rating ? (
                        <Stars rating={review.rating} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      {review.feedback_message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
