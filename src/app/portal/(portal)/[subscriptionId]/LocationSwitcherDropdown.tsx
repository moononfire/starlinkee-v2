"use client";

import { useRouter } from "next/navigation";
import { t } from "@/lib/translations";

interface Subscription {
  subscription_id: number;
  locationName: string | null;
}

interface Props {
  currentSubscriptionId: number;
  subscriptions: Subscription[];
  lang: string;
}

export default function LocationSwitcherDropdown({ currentSubscriptionId, subscriptions, lang }: Props) {
  const router = useRouter();
  
  return (
    <div className="relative w-full">
      <select
        value={currentSubscriptionId}
        onChange={(e) => router.push(`/portal/${e.target.value}`)}
        className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-medium text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block px-3 py-2.5 pr-8 shadow-sm cursor-pointer transition-colors hover:border-gray-300 dark:hover:border-gray-600"
      >
        {subscriptions.map((sub) => (
          <option key={sub.subscription_id} value={sub.subscription_id}>
            {sub.locationName || t("portal_unassigned_subscription", lang)}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
