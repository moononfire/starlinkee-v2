"use client";

import Link from "next/link";
import { portalLogoutAction } from "./actions";

export default function PortalNav({
  customerName,
  customerEmail,
}: {
  customerName: string;
  customerEmail: string;
}) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link
          href="/portal/dashboard"
          className="font-bold text-lg text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Starlinkee
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
            {customerName}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
            {customerEmail}
          </span>
          <form action={portalLogoutAction}>
            <button
              type="submit"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Wyloguj
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
