import { redirect } from "next/navigation";
import { listOrdersReadyToShip } from "@/lib/db/orders";
import { createShipmentFull } from "@/lib/db/shipments";

async function createShipmentAction(formData: FormData) {
  "use server";

  const orderId = parseInt(formData.get("order_id") as string);
  const trackingNumber = (formData.get("tracking_number") as string) || undefined;
  const carrier = (formData.get("carrier") as string) || undefined;
  const shippedAt = (formData.get("shipped_at") as string) || undefined;
  const recipientName = (formData.get("recipient_name") as string) || undefined;
  const recipientEmail = (formData.get("recipient_email") as string) || undefined;
  const recipientPhone = (formData.get("recipient_phone") as string) || undefined;
  const addressLine1 = (formData.get("address_line1") as string) || undefined;
  const addressLine2 = (formData.get("address_line2") as string) || undefined;
  const city = (formData.get("city") as string) || undefined;
  const postalCode = (formData.get("postal_code") as string) || undefined;
  const country = (formData.get("country") as string) || undefined;
  const numberOfPlatesRaw = formData.get("number_of_plates") as string;
  const numberOfPlates = numberOfPlatesRaw ? parseInt(numberOfPlatesRaw) : undefined;
  const batchLabel = (formData.get("batch_label") as string) || undefined;

  await createShipmentFull({
    order_id: orderId,
    tracking_number: trackingNumber,
    carrier,
    shipped_at: shippedAt ? new Date(shippedAt).toISOString() : undefined,
    recipient_name: recipientName,
    recipient_email: recipientEmail,
    recipient_phone: recipientPhone,
    address_line1: addressLine1,
    address_line2: addressLine2,
    city,
    postal_code: postalCode,
    country,
    number_of_plates: numberOfPlates,
    batch_label: batchLabel,
  });

  redirect("/admin/shipments");
}

const inputClass =
  "w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default async function NewShipmentPage() {
  const orders = await listOrdersReadyToShip();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Nowa wysyłka</h1>
      <form
        action={createShipmentAction}
        className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-6 max-w-2xl space-y-5"
      >
        <div>
          <label className={labelClass}>Zamówienie (opłacone) *</label>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400">
              Brak zamówień gotowych do wysyłki
            </p>
          ) : (
            <select name="order_id" required className={inputClass}>
              <option value="">— wybierz zamówienie —</option>
              {orders.map((o) => (
                <option key={o.order_id} value={o.order_id}>
                  #{o.order_id} · {o.customer_name} ({o.customer_email})
                  {o.items.length > 0
                    ? ` · ${o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}`
                    : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <fieldset className="border border-gray-200 dark:border-gray-600 rounded p-4 space-y-4">
          <legend className="text-sm font-medium text-gray-600 dark:text-gray-300 px-1">Tracking</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Numer tracking</label>
              <input name="tracking_number" className={inputClass} placeholder="np. PL123456789PL" />
            </div>
            <div>
              <label className={labelClass}>Przewoźnik</label>
              <input name="carrier" className={inputClass} placeholder="np. DPD, InPost, DHL" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data i godzina wysyłki</label>
              <input
                name="shipped_at"
                type="datetime-local"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Liczba płytek</label>
              <input
                name="number_of_plates"
                type="number"
                min="1"
                className={inputClass}
                placeholder="np. 3"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Batch label</label>
            <input name="batch_label" className={inputClass} placeholder="np. BATCH-2026-06" />
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 dark:border-gray-600 rounded p-4 space-y-4">
          <legend className="text-sm font-medium text-gray-600 dark:text-gray-300 px-1">Odbiorca</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Imię i nazwisko</label>
              <input name="recipient_name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="recipient_email" type="email" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Telefon</label>
              <input name="recipient_phone" type="tel" className={inputClass} />
            </div>
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 dark:border-gray-600 rounded p-4 space-y-4">
          <legend className="text-sm font-medium text-gray-600 dark:text-gray-300 px-1">Adres</legend>
          <div>
            <label className={labelClass}>Ulica i numer</label>
            <input name="address_line1" className={inputClass} placeholder="np. ul. Kwiatowa 12" />
          </div>
          <div>
            <label className={labelClass}>Adres cd. (opcjonalnie)</label>
            <input name="address_line2" className={inputClass} placeholder="np. m. 5" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Kod pocztowy</label>
              <input name="postal_code" className={inputClass} placeholder="00-000" />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Miasto</label>
              <input name="city" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Kraj</label>
            <input name="country" className={inputClass} placeholder="np. Polska" />
          </div>
        </fieldset>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Utwórz wysyłkę
          </button>
          <a
            href="/admin/shipments"
            className="px-5 py-2 rounded text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Anuluj
          </a>
        </div>
      </form>
    </div>
  );
}
