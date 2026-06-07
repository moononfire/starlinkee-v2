"use client";

import { useTransition } from "react";
import { loginAction } from "./actions";

export default function LoginForm({ error }: { error?: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => loginAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-8 space-y-5">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error === "invalid_credentials" ? "Nieprawidłowy email lub hasło." : error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Logowanie..." : "Zaloguj się"}
      </button>
    </form>
  );
}
