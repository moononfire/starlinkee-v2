import { listLocations } from "@/lib/db/locations";

const subStatusClass: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  inactive: "bg-gray-100 text-gray-500",
};
const subStatusLabel: Record<string, string> = {
  active: "Aktywna",
  pending: "Oczekuje",
  inactive: "Nieaktywna",
};

export default async function PlacesPage() {
  const locations = await listLocations();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Places</h1>
        <span className="text-sm text-gray-500">{locations.length} lokalizacji</span>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nazwa lokalizacji</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Klient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Google Business</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Miasto / Kraj</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Sub.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Skany płytek</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Wizyty Linktree</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Google Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {locations.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Brak lokalizacji
                </td>
              </tr>
            )}
            {locations.map((loc) => (
              <tr key={loc.location_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{loc.location_id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{loc.location_name}</div>
                  {loc.support_email && (
                    <div className="text-gray-400 text-xs">{loc.support_email}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{loc.customer_name || "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  <div>{loc.google_business_name ?? "—"}</div>
                  {loc.google_places_id && (
                    <div className="text-gray-400 text-xs font-mono truncate max-w-[160px]">
                      {loc.google_places_id}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {[loc.city, loc.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  {loc.subscription_status ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${subStatusClass[loc.subscription_status] ?? "bg-gray-100 text-gray-500"}`}>
                      {subStatusLabel[loc.subscription_status] ?? loc.subscription_status}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 font-medium">{loc.total_plate_visits}</td>
                <td className="px-4 py-3 text-gray-600">{loc.linktree_visits}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                  {loc.linktree_slug ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {loc.google_review_link ? (
                    <a
                      href={loc.google_review_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Link
                    </a>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
