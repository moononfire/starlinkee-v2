import { redirect } from "next/navigation";
import { listSubscriptions } from "@/lib/db/subscriptions";
import SearchInput from "@/components/admin/SearchInput";
import { assertAdmin } from "@/lib/api-auth";
import { issueActivationCode } from "@/lib/services/activation";

const statusLabel = { pending: "Oczekuje", active: "Aktywna", inactive: "Nieaktywna" };
const statusClass = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

async function sendActivationCodeAction(formData: FormData) {
  "use server";
  await assertAdmin();

  const subscriptionId = Number(formData.get("subscription_id"));
  const ok = subscriptionId ? await issueActivationCode(subscriptionId) : false;
  redirect(`/admin/subscriptions?code=${ok ? "sent" : "failed"}&sub=${subscriptionId}`);
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; code?: string; sub?: string }>;
}) {
  const { q, code, sub } = await searchParams;
  const subscriptions = await listSubscriptions(q);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Subskrypcje</h1>
      </div>

      {code === "sent" && (
        <p className="mb-4 text-sm text-green-700 dark:text-green-400">
          Kod aktywacyjny dla subskrypcji #{sub} został wysłany do klienta (poprzedni kod przestał działać).
        </p>
      )}
      {code === "failed" && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          Nie udało się wysłać kodu dla subskrypcji #{sub} (subskrypcja nie jest oczekująca, brak e-maila klienta albo błąd wysyłki).
        </p>
      )}

      <div className="mb-6">
        <SearchInput placeholder="Szukaj po kliencie, email, nazwie planu, tabliczce..." />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Klient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Tabliczka</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Dni</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Aktywacja</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Wygaśnięcie</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Kod aktywacyjny</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Brak subskrypcji
                </td>
              </tr>
            )}
            {subscriptions.map((s) => (
              <tr key={s.subscription_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.subscription_id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{s.customer_name}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">{s.customer_email}</div>
                </td>
                <td className="px-4 py-3">
                  {s.plate_numbers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {s.plate_numbers.map((p) => (
                        <span key={p} className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">Nieprzypisana</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.duration_in_days}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass[s.status]}`}>
                    {statusLabel[s.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {s.activation_datetime
                    ? new Date(s.activation_datetime).toLocaleDateString("pl-PL")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {s.expiration_datetime
                    ? new Date(s.expiration_datetime).toLocaleDateString("pl-PL")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {s.status === "pending" && s.plate_numbers.length > 0 ? (
                    <form action={sendActivationCodeAction}>
                      <input type="hidden" name="subscription_id" value={s.subscription_id} />
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {s.activation_code_hash ? "Wyślij nowy kod" : "Wyślij kod"}
                      </button>
                    </form>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
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
