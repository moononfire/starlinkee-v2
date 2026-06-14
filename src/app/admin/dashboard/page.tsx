import { createAdminClient } from "@/lib/supabase/admin";

async function getStats() {
  const supabase = createAdminClient();
  const [customers, subscriptions, orders, plates, reviews, shipments] = await Promise.all([
    supabase.from("customers").select("customer_id", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("subscription_id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("orders").select("order_id", { count: "exact", head: true }),
    supabase.from("plates").select("plate_id", { count: "exact", head: true }),
    supabase
      .from("reviews")
      .select("review_id", { count: "exact", head: true })
      .not("rating", "is", null),
    supabase
      .from("shipments")
      .select("id", { count: "exact", head: true })
      .eq("shipping_status", "shipped"),
  ]);
  return {
    customers: customers.count ?? 0,
    activeSubscriptions: subscriptions.count ?? 0,
    orders: orders.count ?? 0,
    plates: plates.count ?? 0,
    reviews: reviews.count ?? 0,
    shipments: shipments.count ?? 0,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "Klienci", value: stats.customers },
    { label: "Aktywne subskrypcje", value: stats.activeSubscriptions },
    { label: "Zamówienia", value: stats.orders },
    { label: "Płytki (łącznie)", value: stats.plates },
    { label: "Oceny wystawione", value: stats.reviews },
    { label: "Wysyłki w drodze", value: stats.shipments },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-3 gap-6">
        {cards.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
