"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { t } from "@/lib/translations";

interface Props {
  ssid: string;
  password?: string;
  lang: string;
}

export default function WifiWidget({ ssid, password, lang }: Props) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrValue = password ? `WIFI:T:WPA;S:${ssid};P:${password};;` : `WIFI:T:nopass;S:${ssid};;`;

  return (
    <div className="w-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Wi-Fi</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">{ssid}</p>
          </div>
        </div>
        <button
          onClick={() => setShowQr(!showQr)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          title={t("portal_wifi_qr_title", lang)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <rect x="7" y="7" width="3" height="3" />
            <rect x="14" y="7" width="3" height="3" />
            <rect x="7" y="14" width="3" height="3" />
            <rect x="14" y="14" width="3" height="3" />
          </svg>
        </button>
      </div>

      {showQr && (
        <div className="flex flex-col items-center justify-center py-4 mb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-white p-3 rounded-xl">
            <QRCode value={qrValue} size={150} level="M" />
          </div>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3 font-medium">
            {t("portal_wifi_qr_title", lang)}
          </p>
        </div>
      )}

      {password && (
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
          <div className="flex-1 px-3 text-sm text-gray-700 dark:text-gray-300 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
            {password}
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 px-4 py-1.5 bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            {copied ? t("portal_wifi_copy_success", lang) : t("portal_wifi_copy", lang)}
          </button>
        </div>
      )}
    </div>
  );
}
