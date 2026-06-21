"use client";

import { useTransition } from "react";
import { resetPasswordAction } from "./actions";

export default function ResetPasswordForm({ error }: { error?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(() => resetPasswordAction(formData))
      }
      className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-8 space-y-5"
    >
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">
          {error === "passwords_mismatch"
            ? "Hasła nie są identyczne."
            : error === "password_too_short"
              ? "Hasło musi mieć co najmniej 8 znaków."
              : "Wystąpił błąd. Spróbuj ponownie."}
        </p>
      )}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Nowe hasło
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
        {isPending ? "Zapisywanie..." : "Ustaw nowe hasło"}
      </button>
    </form>
  );
}
