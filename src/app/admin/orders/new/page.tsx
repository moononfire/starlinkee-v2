import { redirect } from "next/navigation";
import { listCustomers } from "@/lib/db/customers";
import { listUnassignedPlates } from "@/lib/db/plates";
import { createOrderManual, createOrderItem, createShipment } from "@/lib/db/orders";
import { createSubscription } from "@/lib/db/subscriptions";
import { assignPlateToSubscription } from "@/lib/db/plates";
import { sendOrderConfirmationToAdmin } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import PlatesPicker from "@/components/admin/PlatesPicker";
import ShipmentSection from "@/components/admin/ShipmentSection";

const PRODUCTS = [
  { product_id: 0, name: "1 tydzień (free trial)", duration: 7, is_free: true },
  { product_id: 1, name: "1 rok", duration: 365, is_free: false },
  { product_id: 5, name: "2 tygodnie (free trial)", duration: 14, is_free: true },
  { product_id: 6, name: "10 dni (free trial)", duration: 10, is_free: true },
];

async function createOrderAction(formData: FormData) {
  "use server";

  const customerId = parseInt(formData.get("customer_id") as string);
  const productId = parseInt(formData.get("product_id") as string);
  const plateNumbers = (formData.getAll("plate_ids") as string[]).map((id) =>
    parseInt(id)
  );
  const paymentMethod = formData.get("payment_method") as "bank_transfer" | "cash";
  const reference = formData.get("reference") as string | null;
  const withShipment = formData.get("with_shipment") === "on";
  const recipientName = formData.get("recipient_name") as string | null;
  const addressLine1 = formData.get("address_line1") as string | null;
  const city = formData.get("city") as string | null;
  const postalCode = formData.get("postal_code") as string | null;
  const country = formData.get("country") as string | null;

  const product = PRODUCTS.find((p) => p.product_id === productId);
  if (!product) throw new Error("Invalid product");

  const orderId = await createOrderManual({
    customer_id: customerId,
    payment_method: paymentMethod,
    internal_payment_reference: reference || undefined,
  });

  await createOrderItem(orderId, productId, 1);
  await createOrderItem(orderId, 2, plateNumbers.length);

  const sub = await createSubscription({
    customer_id: customerId,
    subscription_name: "Subskrypcja",
    duration_in_days: product.duration,
    is_free: product.is_free,
  });

  for (const plateId of plateNumbers) {
    await assignPlateToSubscription(plateId, sub.subscription_id);
  }

  if (withShipment) {
    await createShipment({
      order_id: orderId,
      recipient_name: recipientName || undefined,
      address_line1: addressLine1 || undefined,
      city: city || undefined,
      postal_code: postalCode || undefined,
      country: country || undefined,
    });
  }

  await sendOrderConfirmationToAdmin({
    orderId,
    customerName: "",
    customerEmail: "",
    plateCount: plateNumbers.length,
  }).catch(() => {});

  redirect("/admin/orders");
}

export default async function NewOrderPage() {
  const [customers, plates] = await Promise.all([
    listCustomers(),
    listUnassignedPlates(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Nowe zamówienie</h1>
      <form action={createOrderAction} className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-6 max-w-2xl space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Klient *</label>
          <select
            name="customer_id"
            required
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— wybierz klienta —</option>
            {customers.map((c) => (
              <option key={c.customer_id} value={c.customer_id}>
                {c.customer_name} ({c.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subskrypcja *</label>
          <select
            name="product_id"
            required
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PRODUCTS.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Płytki *
          </label>
          {plates.length === 0 ? (
            <p className="text-sm text-gray-400">Brak dostępnych płytek (wszystkie przypisane)</p>
          ) : (
            <PlatesPicker plates={plates} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metoda płatności *</label>
            <select
              name="payment_method"
              required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bank_transfer">Przelew</option>
              <option value="cash">Gotówka</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ref. wewnętrzna
            </label>
            <input
              name="reference"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <ShipmentSection />

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Utwórz zamówienie
          </button>
          <a
            href="/admin/orders"
            className="px-5 py-2 rounded text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Anuluj
          </a>
        </div>
      </form>
    </div>
  );
}
