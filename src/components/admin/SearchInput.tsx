"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef, useTransition } from "react";

export default function SearchInput({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);
  }

  return (
    <div className="relative w-full max-w-md">
      <input
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm text-black dark:text-gray-100 dark:bg-gray-800 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
