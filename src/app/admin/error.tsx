"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Coś poszło nie tak</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Nie udało się załadować tej strony. Spróbuj ponownie za chwilę.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Kod błędu: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
