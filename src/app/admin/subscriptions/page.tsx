import { listSubscriptions } from "@/lib/db/subscriptions";

export default async function SubscriptionsPage() {
  const subscriptions = await listSubscriptions();

  const statusLabel = {
    pending: "Oczekuje",
    active: "Aktywna",
    inactive: "Nieaktywna",
  };
  const statusClass = {
    pending: "bg-yellow-100 text-yellow-700",
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-500",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Subskrypcje</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Klient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nazwa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Aktywacja</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Wygaśnięcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Brak subskrypcji
                </td>
              </tr>
            )}
            {subscriptions.map((s) => (
              <tr key={s.subscription_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{s.subscription_id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{s.customer_name}</div>
                  <div className="text-gray-500 text-xs">{s.customer_email}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">{s.subscription_name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass[s.status]}`}
                  >
                    {statusLabel[s.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {s.activation_datetime
                    ? new Date(s.activation_datetime).toLocaleDateString("pl-PL")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {s.expiration_datetime
                    ? new Date(s.expiration_datetime).toLocaleDateString("pl-PL")
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
