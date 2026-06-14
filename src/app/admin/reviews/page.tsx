import { listReviews } from "@/lib/db/reviews";

const stars = (n: number | null) =>
  n === null ? "—" : "★".repeat(n) + "☆".repeat(5 - n);

export default async function ReviewsPage() {
  const reviews = await listReviews();
  const rated = reviews.filter((r) => r.rating !== null);
  const scansOnly = reviews.filter((r) => r.rating === null);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recenzje</h1>
        <span className="text-sm text-gray-500">
          {rated.length} z oceną · {scansOnly.length} samych skanów
        </span>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Lokalizacja</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Płytka</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ocena</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Wiadomość</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kontakt</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data skanu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reviews.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Brak recenzji
                </td>
              </tr>
            )}
            {reviews.map((r) => (
              <tr key={r.review_id} className={`hover:bg-gray-50 ${r.rating === null ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 text-gray-500">{r.review_id}</td>
                <td className="px-4 py-3 text-gray-700">{r.location_name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-gray-600">{r.plate_number}</td>
                <td className="px-4 py-3 text-yellow-500 tracking-tighter">
                  {stars(r.rating)}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                  {r.feedback_message ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {r.contact_email && r.contact_email !== "anonymous@anonymous.com"
                    ? r.contact_email
                    : r.contact_phone && r.contact_phone !== "anonymous"
                    ? r.contact_phone
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(r.scan_time).toLocaleDateString("pl-PL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
