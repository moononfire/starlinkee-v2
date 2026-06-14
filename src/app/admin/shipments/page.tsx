import Link from "next/link";
import { listShipments } from "@/lib/db/shipments";

const statusLabel = {
  pending: "Oczekuje",
  shipped: "Wysłane",
  delivered: "Dostarczone",
  cancelled: "Anulowane",
};
const statusClass = {
  pending: "bg-yellow-100 text-yellow-700",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function ShipmentsPage() {
  const shipments = await listShipments();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Wysyłki</h1>
        <Link
          href="/admin/shipments/new"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Nowa wysyłka
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Zamów.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Klient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Batch</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Płytki</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tracking</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Adres</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Wysłano</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shipments.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Brak wysyłek
                </td>
              </tr>
            )}
            {shipments.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{s.id}</td>
                <td className="px-4 py-3 text-gray-500">#{s.order_id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{s.customer_name || s.recipient_name || "—"}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{s.batch_label ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{s.number_of_plates ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass[s.shipping_status]}`}>
                    {statusLabel[s.shipping_status]}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-gray-600 text-xs">
                  {s.tracking_number
                    ? `${s.carrier ? s.carrier + " · " : ""}${s.tracking_number}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {[s.address_line1, s.city, s.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {s.shipped_at
                    ? new Date(s.shipped_at).toLocaleDateString("pl-PL")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
