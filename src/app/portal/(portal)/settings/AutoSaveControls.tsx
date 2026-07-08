"use client";

import { useFormStatus } from "react-dom";
import { t } from "@/lib/translations";

/**
 * Form controls that submit their parent <form action={...}> immediately on
 * change — no separate "Save" button needed. All of them disable themselves
 * while the action is running (useFormStatus).
 */

export function AutoSaveRadio({
  name,
  value,
  defaultChecked,
}: {
  name: string;
  value: string;
  defaultChecked: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <input
      type="radio"
      name={name}
      value={value}
      defaultChecked={defaultChecked}
      disabled={pending}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="mt-0.5 disabled:opacity-50"
    />
  );
}

export function AutoSaveToggle({
  name,
  defaultChecked,
  ariaLabel,
}: {
  name: string;
  defaultChecked: boolean;
  ariaLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <span className="relative inline-flex shrink-0 mt-0.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={pending}
        aria-label={ariaLabel}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative w-9 h-5 rounded-full bg-gray-300 dark:bg-gray-600 transition-colors cursor-pointer peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1 after:content-[''] after:absolute after:left-0.5 after:top-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
      />
    </span>
  );
}

export function AutoSavePendingHint({ lang }: { lang: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <span className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">
      {t("portal_saving", lang)}
    </span>
  );
}
