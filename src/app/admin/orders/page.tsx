import Link from "next/link";
import { listOrders } from "@/lib/db/orders";
import SearchInput from "@/components/admin/SearchInput";

const statusLabel = {
  pending: "Oczekuje",
  paid: "Opłacone",
  cancelled: "Anulowane",
};
const statusClass = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const paymentLabel: Record<string, string> = {
  stripe: "Stripe",
  bank_transfer: "Przelew",
  cash: "Gotówka",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const orders = await listOrders(q);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Zamówienia</h1>
        <Link
          href="/admin/orders/new"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Nowe zamówienie
        </Link>
      </div>

      <div className="mb-6">
        <SearchInput placeholder="Szukaj po kliencie, email, referencji..." />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Klient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Produkty</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Płatność</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Ref.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Data</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Wykonano</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Brak zamówień
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.order_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{o.order_id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{o.customer_name}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">{o.customer_email}</div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {o.items.length === 0
                    ? "—"
                    : o.items.map((item) => `${item.quantity}× ${item.product_name}`).join(", ")}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass[o.status]}`}>
                    {statusLabel[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {o.payment_method ? paymentLabel[o.payment_method] ?? o.payment_method : "—"}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                  {o.stripe_payment_id
                    ? o.stripe_payment_id.slice(0, 20) + "…"
                    : o.internal_payment_reference ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {new Date(o.created_at).toLocaleDateString("pl-PL")}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {o.fulfilled_at
                    ? new Date(o.fulfilled_at).toLocaleDateString("pl-PL")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
