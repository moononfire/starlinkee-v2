import Link from "next/link";
import { listPlates } from "@/lib/db/plates";

export default async function PlatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const plates = await listPlates(q);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Płytki</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/plates/import"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Import TXT
          </Link>
          <Link
            href="/admin/plates/generate"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Generuj kody
          </Link>
          <Link
            href="/admin/plates/assign"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Przypisz płytkę
          </Link>
        </div>
      </div>

      <form method="GET" className="mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj po numerze płytki..."
          className="w-full max-w-md border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Numer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Secret Key</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Język</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Wizyty</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Subskrypcja</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Klient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plates.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Brak płytek
                </td>
              </tr>
            )}
            {plates.map((p) => (
              <tr key={p.plate_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{p.plate_id}</td>
                <td className="px-4 py-3 font-mono font-medium text-gray-900">
                  {p.plate_number}
                </td>
                <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.secret_key}</td>
                <td className="px-4 py-3 text-gray-600 uppercase">{p.plate_language}</td>
                <td className="px-4 py-3 text-gray-600">{p.number_of_visits}</td>
                <td className="px-4 py-3 text-gray-600">{p.subscription_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{p.customer_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(p.created_at).toLocaleDateString("pl-PL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
