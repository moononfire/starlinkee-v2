import { getPageViewStats } from "@/lib/db/page-views";

const pageTypeLabels: Record<string, string> = {
  linktree: "Linktree",
  review: "Recenzja",
  promo: "Promo",
  promo_claim: "Odbiór kuponu",
  loyalty: "Loyalty",
  plate_scan: "Skan płytki",
};

export default async function AnalyticsPage() {
  const stats = await getPageViewStats(30);

  const sortedPageTypes = Object.entries(stats.by_page_type).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Analityka
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Ostatnie 30 dni
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Wyświetlenia stron
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {stats.total_views}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Unikalne sesje
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {stats.unique_sessions}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Wyświetlenia wg typu strony
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Typ
                </th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Wyświetlenia
                </th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedPageTypes.map(([type, count]) => (
                <tr key={type}>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                    {pageTypeLabels[type] ?? type}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">
                    {count}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">
                    {stats.total_views > 0
                      ? Math.round((count / stats.total_views) * 100)
                      : 0}
                    %
                  </td>
                </tr>
              ))}
              {sortedPageTypes.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-gray-400"
                  >
                    Brak danych
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Top lokalizacje
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Lokalizacja
                </th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Wyświetlenia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {stats.by_location.slice(0, 10).map((loc) => (
                <tr key={loc.location_id}>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                    {loc.location_name}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">
                    {loc.views}
                  </td>
                </tr>
              ))}
              {stats.by_location.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-6 text-center text-gray-400"
                  >
                    Brak danych
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Ostatnie wyświetlenia
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Data
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Typ
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Ścieżka
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-300">
                  Referrer
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {stats.recent_views.map((view) => (
                <tr key={view.id}>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(view.created_at).toLocaleString("pl-PL")}
                  </td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                    {pageTypeLabels[view.page_type] ?? view.page_type}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300 font-mono text-xs">
                    {view.page_path}
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs truncate max-w-[200px]">
                    {view.referrer ?? "—"}
                  </td>
                </tr>
              ))}
              {stats.recent_views.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-gray-400"
                  >
                    Brak danych
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
