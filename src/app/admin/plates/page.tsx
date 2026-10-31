import Link from "next/link";
import { listPlates } from "@/lib/db/plates";
import { plateScanCount } from "@/lib/plate-scans";
import SearchInput from "@/components/admin/SearchInput";

export default async function PlatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const plates = await listPlates(q);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tabliczki</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/plates/import"
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Import TXT
          </Link>
          <Link
            href="/admin/plates/generate"
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Generuj kody
          </Link>
          <Link
            href="/admin/plates/assign"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Przypisz tabliczkę
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <SearchInput placeholder="Szukaj po numerze tabliczki..." />
      </div>

      {/* Below md: one card per plate */}
      <ul className="md:hidden space-y-3" data-testid="plate-cards">
        {plates.length === 0 && (
          <li className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center text-gray-400">Brak tabliczek</li>
        )}
        {plates.map((p) => (
          <li key={p.plate_id} data-testid="plate-card" className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{p.plate_number}</span>
              <span className="text-xs text-gray-400">#{p.plate_id} · <span className="uppercase">{p.plate_language}</span></span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-gray-600 dark:text-gray-300">
              <dt className="text-gray-400">Klient</dt>
              <dd className="break-words">{p.customer_name ?? "—"}</dd>
              <dt className="text-gray-400">Sub. ID</dt>
              <dd>{p.subscription_id ?? "—"}</dd>
              <dt className="text-gray-400">Wizyty</dt>
              <dd>{plateScanCount(p)}</dd>
              <dt className="text-gray-400">Klucz</dt>
              <dd className="font-mono text-xs break-all">{p.secret_key}</dd>
              <dt className="text-gray-400">Data</dt>
              <dd>{new Date(p.created_at).toLocaleDateString("pl-PL")}</dd>
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
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Numer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Secret Key</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Język</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Wizyty</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Sub. ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Klient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {plates.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Brak tabliczek
                </td>
              </tr>
            )}
            {plates.map((p) => (
              <tr key={p.plate_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.plate_id}</td>
                <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-gray-100">
                  {p.plate_number}
                </td>
                <td className="px-4 py-3 font-mono text-gray-500 dark:text-gray-400 text-xs">{p.secret_key}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 uppercase">{p.plate_language}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{plateScanCount(p)}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.subscription_id ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.customer_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {new Date(p.created_at).toLocaleDateString("pl-PL")}
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
