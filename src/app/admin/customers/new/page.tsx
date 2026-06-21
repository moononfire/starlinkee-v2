import { redirect } from "next/navigation";
import { createCustomer } from "@/lib/db/customers";
import { sendCustomerRegistration } from "@/lib/email";

async function createCustomerAction(formData: FormData) {
  "use server";

  const customerName = formData.get("customer_name") as string;
  const email = formData.get("email") as string;
  const customerType = formData.get("customer_type") as "business" | "individual";
  const companyName = formData.get("company_name") as string | null;
  const taxId = formData.get("tax_id") as string | null;
  const phone = formData.get("phone") as string | null;
  const billingAddress = formData.get("billing_address") as string | null;
  const country = formData.get("country") as string | null;
  const preferredLanguage = formData.get("preferred_language") as "en" | "de" | "pl";

  const customer = await createCustomer({
    customer_name: customerName,
    email,
    customer_type: customerType,
    source: "Admin dashboard",
    company_name: companyName || undefined,
    tax_id: taxId || undefined,
    phone: phone || undefined,
    billing_address: billingAddress || undefined,
    country: country || undefined,
    preferred_language: preferredLanguage,
  });

  void sendCustomerRegistration(email, preferredLanguage, {
    customerName,
    orderId: 0,
  }).catch(() => {});

  redirect(`/admin/customers`);
}

export default function NewCustomerPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Nowy klient</h1>
      <form action={createCustomerAction} className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-6 max-w-2xl space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Imię i nazwisko *
            </label>
            <input
              name="customer_name"
              required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Typ klienta *
            </label>
            <select
              name="customer_type"
              required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="business">Firma (business)</option>
              <option value="individual">Osoba prywatna (individual)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Język
            </label>
            <select
              name="preferred_language"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">EN</option>
              <option value="de">DE</option>
              <option value="pl">PL</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nazwa firmy
            </label>
            <input
              name="company_name"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NIP / Tax ID</label>
            <input
              name="tax_id"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
            <input
              name="phone"
              type="tel"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kraj</label>
            <input
              name="country"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Adres rozliczeniowy
          </label>
          <textarea
            name="billing_address"
            rows={2}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Utwórz klienta
          </button>
          <a
            href="/admin/customers"
            className="px-5 py-2 rounded text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Anuluj
          </a>
        </div>
      </form>
    </div>
  );
}
