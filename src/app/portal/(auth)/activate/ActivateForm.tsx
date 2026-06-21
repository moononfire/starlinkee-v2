"use client";

import { useTransition } from "react";
import { activateAccountAction } from "./actions";

export default function ActivateForm({
  token,
  email,
  error,
}: {
  token: string;
  email: string;
  error?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(() => activateAccountAction(formData))
      }
      className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-8 space-y-5"
    >
      <input type="hidden" name="token" value={token} />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">
          {error === "passwords_mismatch"
            ? "Hasła nie są identyczne."
            : error === "password_too_short"
              ? "Hasło musi mieć co najmniej 8 znaków."
              : error === "account_exists"
                ? "Konto z tym adresem email już istnieje. Użyj opcji resetowania hasła."
                : "Wystąpił błąd. Spróbuj ponownie."}
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 rounded-md px-3 py-2">
          {email}
        </p>
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Ustaw hasło
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label
          htmlFor="password_confirm"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Powtórz hasło
        </label>
        <input
          id="password_confirm"
          name="password_confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Aktywowanie..." : "Aktywuj konto"}
      </button>
    </form>
  );
}
