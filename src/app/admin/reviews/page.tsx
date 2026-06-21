import { listReviews } from "@/lib/db/reviews";
import SearchInput from "@/components/admin/SearchInput";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const reviews = await listReviews(q);
  const rated = reviews.filter((r) => r.rating !== null);
  const scansOnly = reviews.filter((r) => r.rating === null);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recenzje</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {rated.length} z oceną · {scansOnly.length} samych skanów
        </span>
      </div>

      <div className="mb-6">
        <SearchInput placeholder="Szukaj po wiadomości, email, telefonie..." />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Lokalizacja</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Płytka</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Ocena</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Wiadomość</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Kontakt</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Data skanu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {reviews.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Brak recenzji
                </td>
              </tr>
            )}
            {reviews.map((r) => (
              <tr key={r.review_id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${r.rating === null ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.review_id}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.location_name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{r.plate_number}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                  {r.rating ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                  {r.feedback_message ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                  {r.contact_email && r.contact_email !== "anonymous@anonymous.com"
                    ? r.contact_email
                    : r.contact_phone && r.contact_phone !== "anonymous"
                    ? r.contact_phone
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {new Date(r.scan_time).toLocaleDateString("pl-PL")}
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
