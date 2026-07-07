import Link from "next/link";
import { listCustomers } from "@/lib/db/customers";
import SearchInput from "@/components/admin/SearchInput";

const typeLabel = { business: "Firma", individual: "Osoba" };
const typeClass = {
  business: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  individual: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Klienci</h1>
        <Link
          href="/admin/customers/new"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Dodaj klienta
        </Link>
      </div>

      <div className="mb-6">
        <SearchInput placeholder="Szukaj po nazwie, email, firmie..." />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Typ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Nazwa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Telefon</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Firma</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Kraj</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Język</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Data</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {customers.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  Brak klientów
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.customer_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-gray-500">{c.customer_id}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeClass[c.customer_type]}`}>
                    {typeLabel[c.customer_type]}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{c.customer_name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.email}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.company_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.country ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 uppercase">{c.preferred_language}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(c.created_at).toLocaleDateString("pl-PL")}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/customers/${c.customer_id}`}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
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
