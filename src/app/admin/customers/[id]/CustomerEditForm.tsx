"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types";

interface Props {
  customer: Customer;
}

export default function CustomerEditForm({ customer }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [customerType, setCustomerType] = useState(customer.customer_type);
  const [customerName, setCustomerName] = useState(customer.customer_name);
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [companyName, setCompanyName] = useState(customer.company_name ?? "");
  const [taxId, setTaxId] = useState(customer.tax_id ?? "");
  const [billingAddress, setBillingAddress] = useState(customer.billing_address ?? "");
  const [country, setCountry] = useState(customer.country ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState(customer.preferred_language);
  const [isActivated, setIsActivated] = useState(customer.is_activated);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const body = {
      customer_id: customer.customer_id,
      customer_type: customerType,
      customer_name: customerName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      company_name: companyName.trim() || null,
      tax_id: taxId.trim() || null,
      billing_address: billingAddress.trim() || null,
      country: country.trim() || null,
      preferred_language: preferredLanguage,
      is_activated: isActivated,
    };

    const res = await fetch("/api/admin/customers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMessage("Zapisano pomyślnie");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setMessage(`Błąd: ${data?.error ?? res.statusText}`);
    }

    setSaving(false);
  }

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Dane podstawowe */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dane podstawowe</h2>

        <div>
          <label className={labelClass}>Typ klienta</label>
          <select
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value as Customer["customer_type"])}
            className={inputClass}
          >
            <option value="individual">Osoba</option>
            <option value="business">Firma</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Nazwa</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Telefon</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isActivated}
            onChange={(e) => setIsActivated(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Konto aktywowane</span>
        </div>
      </section>

      {/* Dane firmowe */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dane firmowe</h2>

        <div>
          <label className={labelClass}>Nazwa firmy</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>NIP</label>
          <input
            type="text"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Adres rozliczeniowy</label>
          <textarea
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>
      </section>

      {/* Dane dodatkowe */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dane dodatkowe</h2>

        <div>
          <label className={labelClass}>Kraj</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Preferowany język</label>
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value as Customer["preferred_language"])}
            className={inputClass}
          >
            <option value="pl">Polski</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Zapisywanie..." : "Zapisz"}
        </button>
        {message && (
          <span className={`text-sm ${message.startsWith("Błąd") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
