import Link from "next/link";
import { listOrders } from "@/lib/db/orders";

export default async function OrdersPage() {
  const orders = await listOrders();

  const statusLabel = {
    pending: "Oczekuje",
    paid: "Opłacone",
    cancelled: "Anulowane",
  };
  const statusClass = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Zamówienia</h1>
        <Link
          href="/admin/orders/new"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Nowe zamówienie
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Klient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Płatność</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ref. wewnętrzna</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Brak zamówień
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.order_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{o.order_id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{o.customer_name}</div>
                  <div className="text-gray-500 text-xs">{o.customer_email}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass[o.status]}`}
                  >
                    {statusLabel[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{o.payment_method ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {o.internal_payment_reference ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(o.created_at).toLocaleDateString("pl-PL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
