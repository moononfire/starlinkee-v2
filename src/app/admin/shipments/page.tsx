import Link from "next/link";
import { listShipments } from "@/lib/db/shipments";
import SearchInput from "@/components/admin/SearchInput";

const statusLabel = {
  pending: "Oczekuje",
  shipped: "Wysłane",
  delivered: "Dostarczone",
  cancelled: "Anulowane",
};
const statusClass = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  shipped: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const shipments = await listShipments(q);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Wysyłki</h1>
        <Link
          href="/admin/shipments/new"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Nowa wysyłka
        </Link>
      </div>

      <div className="mb-6">
        <SearchInput placeholder="Szukaj po tracking, odbiorcy, batch, mieście..." />
      </div>

      {/* Below md: one card per shipment */}
      <ul className="md:hidden space-y-3" data-testid="shipment-cards">
        {shipments.length === 0 && (
          <li className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center text-gray-400">Brak wysyłek</li>
        )}
        {shipments.map((s) => (
          <li key={s.id} data-testid="shipment-card" className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 break-words">{s.customer_name || s.recipient_name || "—"}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">#{s.id} · zamówienie #{s.order_id}</div>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusClass[s.shipping_status]}`}>
                {statusLabel[s.shipping_status]}
              </span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-gray-600 dark:text-gray-300">
              <dt className="text-gray-400">Tabliczki</dt>
              <dd>{s.number_of_plates ?? "—"}</dd>
              <dt className="text-gray-400">Batch</dt>
              <dd className="break-words">{s.batch_label ?? "—"}</dd>
              <dt className="text-gray-400">Tracking</dt>
              <dd className="font-mono text-xs break-all">{s.tracking_number ? `${s.carrier ? s.carrier + " · " : ""}${s.tracking_number}` : "—"}</dd>
              <dt className="text-gray-400">Adres</dt>
              <dd className="break-words">{[s.address_line1, s.city, s.country].filter(Boolean).join(", ") || "—"}</dd>
              <dt className="text-gray-400">Wysłano</dt>
              <dd>{s.shipped_at ? new Date(s.shipped_at).toLocaleDateString("pl-PL") : "—"}</dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden md:block bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Zamów.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Klient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Batch</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Tabliczki</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Tracking</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Adres</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Wysłano</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {shipments.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Brak wysyłek
                </td>
              </tr>
            )}
            {shipments.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.id}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">#{s.order_id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{s.customer_name || s.recipient_name || "—"}</div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.batch_label ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.number_of_plates ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass[s.shipping_status]}`}>
                    {statusLabel[s.shipping_status]}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300 text-xs">
                  {s.tracking_number
                    ? `${s.carrier ? s.carrier + " · " : ""}${s.tracking_number}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                  {[s.address_line1, s.city, s.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
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
    </div>
  );
}
