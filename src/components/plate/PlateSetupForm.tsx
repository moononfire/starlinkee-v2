"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  plateNumber: string;
  plateSecret: string;
  lang: string;
}

export default function PlateSetupForm({ plateNumber, plateSecret, lang }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    // Pass plateNumber and plateSecret so the server can re-verify
    form.append("plateNumber", plateNumber);
    form.append("plateSecret", plateSecret);

    const res = await fetch("/api/plate/setup", {
      method: "POST",
      body: form,
    });

    setLoading(false);

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Something went wrong");
      return;
    }

    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">
          Set up your plate
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business name *
            </label>
            <input
              name="location_name"
              required
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Business name
            </label>
            <input
              name="google_business_name"
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Business address
            </label>
            <input
              name="google_business_address"
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google review link *
            </label>
            <input
              name="google_review_link"
              required
              type="url"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Support email *
            </label>
            <input
              name="support_email"
              required
              type="email"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo (PNG or JPG, max 5MB)
            </label>
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg"
              className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? "Setting up..." : "Activate plate"}
          </button>
        </form>
      </div>
    </main>
  );
}
