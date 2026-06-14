import Link from "next/link";
import { listCustomers } from "@/lib/db/customers";

const typeLabel = { business: "Firma", individual: "Osoba" };
const typeClass = {
  business: "bg-purple-100 text-purple-700",
  individual: "bg-blue-100 text-blue-700",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const customers = await listCustomers(q);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Klienci</h1>
        <Link
          href="/admin/customers/new"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Dodaj klienta
        </Link>
      </div>

      <form method="GET" className="mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj po nazwie, email, firmie..."
          className="w-full max-w-md border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Typ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nazwa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Telefon</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Firma</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kraj</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Język</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Brak klientów
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.customer_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{c.customer_id}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeClass[c.customer_type]}`}>
                    {typeLabel[c.customer_type]}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{c.customer_name}</td>
                <td className="px-4 py-3 text-gray-600">{c.email}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{c.company_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{c.country ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 uppercase">{c.preferred_language}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(c.created_at).toLocaleDateString("pl-PL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
