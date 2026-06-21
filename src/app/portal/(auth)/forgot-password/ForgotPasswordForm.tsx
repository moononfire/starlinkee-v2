"use client";

import { useTransition } from "react";
import { forgotPasswordAction } from "./actions";
import Link from "next/link";

export default function ForgotPasswordForm({
  sent,
  error,
}: {
  sent?: boolean;
  error?: string;
}) {
  const [isPending, startTransition] = useTransition();

  if (sent) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-8 text-center">
        <div className="text-4xl mb-4">&#9993;</div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Sprawdź email
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Jeśli konto z tym adresem istnieje, wysłaliśmy link do resetowania
          hasła.
        </p>
        <Link
          href="/portal/login"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Wróć do logowania
        </Link>
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(() => forgotPasswordAction(formData))
      }
      className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-8 space-y-5"
    >
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">
          Wystąpił błąd. Spróbuj ponownie.
        </p>
      )}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Podaj adres email powiązany z Twoim kontem. Wyślemy link do ustawienia
        nowego hasła.
      </p>
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
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Wysyłanie..." : "Wyślij link"}
      </button>
      <div className="text-center">
        <Link
          href="/portal/login"
          className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
        >
          Wróć do logowania
        </Link>
      </div>
    </form>
  );
}
