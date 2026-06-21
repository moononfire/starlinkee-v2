"use client";

import { useTransition } from "react";
import { portalLoginAction } from "./actions";
import Link from "next/link";

export default function LoginForm({ error }: { error?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => portalLoginAction(formData))}
      className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-8 space-y-5"
    >
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">
          {error === "invalid_credentials"
            ? "Nieprawidłowy email lub hasło."
            : error === "change_password"
              ? "Zaloguj się nowym hasłem."
              : "Wystąpił błąd. Spróbuj ponownie."}
        </p>
      )}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Adres email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="jan@firma.pl"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Hasło
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Logowanie..." : "Zaloguj się"}
      </button>
      <div className="text-center">
        <Link
          href="/portal/forgot-password"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Zapomniałem hasła
        </Link>
      </div>
    </form>
  );
}
