import { redirect } from "next/navigation";
import { listUnassignedPlates, assignPlateToSubscription } from "@/lib/db/plates";
import { listSubscriptions } from "@/lib/db/subscriptions";

async function assignPlateAction(formData: FormData) {
  "use server";

  const plateId = parseInt(formData.get("plate_id") as string);
  const subscriptionId = parseInt(formData.get("subscription_id") as string);

  await assignPlateToSubscription(plateId, subscriptionId);
  redirect("/admin/plates");
}

export default async function AssignPlatePage() {
  const [plates, subscriptions] = await Promise.all([
    listUnassignedPlates(),
    listSubscriptions(),
  ]);

  const pendingSubs = subscriptions.filter((s) => s.status === "pending");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Przypisz płytkę do subskrypcji</h1>
      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-6 max-w-lg">
        {plates.length === 0 && (
          <p className="text-sm text-gray-400 mb-4">Brak dostępnych płytek (wszystkie przypisane)</p>
        )}
        {pendingSubs.length === 0 && (
          <p className="text-sm text-gray-400 mb-4">Brak subskrypcji ze statusem pending</p>
        )}
        <form action={assignPlateAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Płytka *</label>
            <select
              name="plate_id"
              required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            >
              <option value="">— wybierz płytkę —</option>
              {plates.map((p) => (
                <option key={p.plate_id} value={p.plate_id}>
                  {p.plate_number} ({p.plate_language})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subskrypcja (pending) *
            </label>
            <select
              name="subscription_id"
              required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— wybierz subskrypcję —</option>
              {pendingSubs.map((s) => (
                <option key={s.subscription_id} value={s.subscription_id}>
                  #{s.subscription_id} — {s.customer_name} — {s.subscription_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={plates.length === 0 || pendingSubs.length === 0}
              className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Przypisz
            </button>
            <a
              href="/admin/plates"
              className="px-5 py-2 rounded text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Anuluj
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
