"use client";

import { useState } from "react";

const inputClass =
  "w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ShipmentSection() {
  const [enabled, setEnabled] = useState(false);

  return (
    <fieldset className="border border-gray-200 dark:border-gray-600 rounded p-4 space-y-3">
      <legend className="text-sm font-medium text-gray-600 dark:text-gray-300 px-1">
        Wysyłka
      </legend>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          name="with_shipment"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded border-gray-300 dark:border-gray-600"
        />
        Wysłać przesyłkę (odznacz jeśli sprzedaż osobista)
      </label>

      {enabled && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Odbiorca
            </label>
            <input name="recipient_name" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Adres
            </label>
            <input name="address_line1" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Miasto
            </label>
            <input name="city" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kod pocztowy
            </label>
            <input name="postal_code" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kraj
            </label>
            <input name="country" className={inputClass} />
          </div>
        </div>
      )}
    </fieldset>
  );
}
