"use client";

import type { LocationLead } from "@/lib/types";
import { t } from "@/lib/translations";

const DATE_LOCALES: Record<string, string> = { en: "en-US", de: "de-DE", pl: "pl-PL" };

function formatDate(d: string, lang: string) {
  const locale = DATE_LOCALES[lang] ?? "en-US";
  return new Date(d).toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function PromoContactsTable({ leads, lang }: { leads: LocationLead[]; lang: string }) {
  function exportCsv() {
    const locale = DATE_LOCALES[lang] ?? "en-US";
    const header = t("portal_contacts_csv_header", lang);
    const rows = leads.map((l) =>
      [
        l.phone,
        l.email ?? "",
        l.agreed_to_terms ? t("portal_yes", lang) : t("portal_no", lang),
        l.is_used ? t("portal_used", lang) : t("portal_active", lang),
        new Date(l.created_at).toLocaleDateString(locale),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kontakty-promo.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalUsed = leads.filter((l) => l.is_used).length;
  const withEmail = leads.filter((l) => l.email).length;
  const withConsent = leads.filter((l) => l.agreed_to_terms).length;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("portal_contacts_title", lang)}
          </h3>
          {leads.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">{leads.length}</span> {t("portal_contacts_total", lang)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">{totalUsed}</span> {t("portal_contacts_used", lang)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">{withEmail}</span> {t("portal_contacts_with_email", lang)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">{withConsent}</span> {t("portal_contacts_with_consent", lang)}
              </span>
            </div>
          )}
        </div>
        {leads.length > 0 && (
          <button
            onClick={exportCsv}
            className="shrink-0 text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t("portal_export_csv", lang)}
          </button>
        )}
      </div>

      {leads.length === 0 ? (
        <p className="px-5 py-10 text-sm text-gray-400 dark:text-gray-500 text-center">
          {t("portal_no_contacts", lang)}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">
                  {t("portal_phone", lang)}
                </th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">
                  {t("portal_email", lang)}
                </th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">
                  {t("portal_consent", lang)}
                </th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">
                  {t("portal_status", lang)}
                </th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">
                  {t("portal_date", lang)}
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                >
                  <td className="px-5 py-3 font-mono text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {lead.phone}
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                    {lead.email ?? <span className="text-gray-400 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    {lead.agreed_to_terms ? (
                      <span className="text-green-600 dark:text-green-400 text-xs">✓ {t("portal_yes", lang)}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">{t("portal_no", lang)}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {lead.is_used ? (
                      <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full whitespace-nowrap">
                        {t("portal_used", lang)}
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-full whitespace-nowrap">
                        {t("portal_active", lang)}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap hidden sm:table-cell">
                    {formatDate(lead.created_at, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
