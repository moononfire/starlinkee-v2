"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import type { CustomerLocation } from "@/lib/types";
import { t } from "@/lib/translations";
import SavableForm from "../../SavableForm";
import SubmitButton from "../../SubmitButton";
import { updateWifiSettingsAction } from "./actions";
import { AutoSaveToggle, AutoSavePendingHint } from "../../settings/AutoSaveControls";

export default function WifiSettings({
  subscriptionId,
  location,
  lang,
}: {
  subscriptionId: number;
  location: CustomerLocation;
  lang: string;
}) {
  const [ssid, setSsid] = useState(location.wifi_ssid || "");
  const [password, setPassword] = useState(location.wifi_password || "");
  const [copied, setCopied] = useState(false);

  const qrValue = `WIFI:T:WPA;S:${ssid};P:${password};;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_wifi_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          {t("portal_wifi_desc", lang)}
        </p>

        <SavableForm
          action={updateWifiSettingsAction}
          className="space-y-4"
          lang={lang}
        >
          <input type="hidden" name="location_id" value={location.location_id} />
          
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <AutoSaveToggle
              name="has_wifi_enabled"
              defaultChecked={location.has_wifi_enabled}
              ariaLabel="WiFi Enabled"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Włącz pokazanie Wi-Fi / Enable Wi-Fi sharing
            </span>
          </label>
          <AutoSavePendingHint lang={lang} />

          <div className="flex flex-col gap-3 max-w-sm">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t("portal_wifi_ssid_label", lang)}
              </label>
              <input
                name="wifi_ssid"
                type="text"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                placeholder="My Network"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t("portal_wifi_password_label", lang)}
              </label>
              <div className="flex gap-2">
                <input
                  name="wifi_password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="SecretPassword123"
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!password}
                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-900 dark:text-gray-100 disabled:opacity-50"
                >
                  {copied ? t("portal_wifi_copy_success", lang) : t("portal_wifi_copy", lang)}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <SubmitButton lang={lang}>{t("portal_wifi_save", lang)}</SubmitButton>
            </div>
          </div>
        </SavableForm>

        {ssid && password && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col items-center">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
              {t("portal_wifi_qr_title", lang)}
            </h4>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <QRCode
                value={qrValue}
                size={200}
                level="M"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
