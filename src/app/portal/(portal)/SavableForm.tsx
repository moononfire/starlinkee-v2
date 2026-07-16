"use client";

import { useActionState, useEffect, useState } from "react";
import { t } from "@/lib/translations";
import type { ActionResult } from "./action-result";
import { initialActionResult } from "./action-result";

export default function SavableForm({
  action,
  className,
  lang,
  errorMessages,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  className?: string;
  lang: string;
  errorMessages?: Record<string, string>;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(
    async (_prevState: ActionResult, formData: FormData) => action(formData),
    initialActionResult
  );
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!state.ok) return;
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  const errorText = state.error ? errorMessages?.[state.error] : undefined;

  return (
    <form action={formAction} className={className}>
      {children}
      {(showSaved || errorText) && (
        <div className="mt-2 flex items-center gap-2">
          {showSaved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {t("portal_saved_toast", lang)}
            </span>
          )}
          {errorText && (
            <p className="text-xs text-red-600 dark:text-red-400">{errorText}</p>
          )}
        </div>
      )}
    </form>
  );
}
