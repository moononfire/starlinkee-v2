"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/translations";

interface Props {
  subscriptionId: number;
  lang: string;
  /** Already formatted end of the paid access. */
  endDate: string;
  cancelling: boolean;
}

// Always visible on an active, Stripe-billed subscription (German "Kündigungsbutton"): one clear button,
// then a confirmation step that names the end date, then the actual cancellation.
export default function CancelRenewal({ subscriptionId, lang, endDate, cancelling }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function cancel() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/portal/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setConfirming(false);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const card = "bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5";

  if (cancelling) {
    return (
      <div className={card} data-testid="renewal-cancelled">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t("portal_cancel_scheduled", lang).replace("{date}", endDate)}
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg px-4 py-2 text-sm font-medium bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
        >
          {t("portal_cancel_button", lang)}
        </button>
      ) : (
        <div role="alertdialog" aria-labelledby="cancel-title" className="space-y-3">
          <h3 id="cancel-title" className="font-semibold text-gray-900 dark:text-gray-100">
            {t("portal_cancel_confirm_title", lang)}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t("portal_cancel_confirm_text", lang).replace("{date}", endDate)}
          </p>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{t("portal_cancel_failed", lang)}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {t("portal_cancel_confirm_button", lang)}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
            >
              {t("portal_cancel_back", lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
