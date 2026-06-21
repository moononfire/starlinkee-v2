import Link from "next/link";
import { listLocations } from "@/lib/db/locations";
import SearchInput from "@/components/admin/SearchInput";

const subStatusClass: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  inactive: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};
const subStatusLabel: Record<string, string> = {
  active: "Aktywna",
  pending: "Oczekuje",
  inactive: "Nieaktywna",
};

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const locations = await listLocations(q);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Places</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">{locations.length} lokalizacji</span>
      </div>

      <div className="mb-6">
        <SearchInput placeholder="Szukaj po nazwie, Google Business, mieście, slug..." />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Nazwa lokalizacji</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Klient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Google Business</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Miasto / Kraj</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Sub.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Skany płytek</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Wizyty Linktree</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Slug</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Śr. ocena</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Google Review</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {locations.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-gray-400">
                  Brak lokalizacji
                </td>
              </tr>
            )}
            {locations.map((loc) => (
              <tr key={loc.location_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{loc.location_id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{loc.location_name}</div>
                  {loc.support_email && (
                    <div className="text-gray-400 text-xs">{loc.support_email}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{loc.customer_name || "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  <div>{loc.google_business_name ?? "—"}</div>
                  {loc.google_places_id && (
                    <div className="text-gray-400 text-xs font-mono truncate max-w-[160px]">
                      {loc.google_places_id}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {[loc.city, loc.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  {loc.subscription_status ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${subStatusClass[loc.subscription_status] ?? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                      {subStatusLabel[loc.subscription_status] ?? loc.subscription_status}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">{loc.total_plate_visits}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{loc.linktree_visits}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">
                  {loc.linktree_slug ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                  {loc.avg_rating !== null ? loc.avg_rating : "—"}
                </td>
                <td className="px-4 py-3">
                  {loc.google_review_link ? (
                    <a
                      href={loc.google_review_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                    >
                      Link
                    </a>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/places/${loc.location_id}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium"
                  >
                    Edytuj
                  </Link>
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
