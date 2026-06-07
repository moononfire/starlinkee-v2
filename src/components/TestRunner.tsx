"use client";

import { useState } from "react";

type Suite = {
  id: string;
  label: string;
  group: string;
};

const SUITES: Suite[] = [
  { id: "all", label: "Wszystkie testy", group: "Ogólne" },
  { id: "unit", label: "Unit (wszystkie)", group: "Ogólne" },
  { id: "integration", label: "Integracyjne (wszystkie)", group: "Ogólne" },
  { id: "plate-rating", label: "Plate Rating API", group: "Integracyjne" },
  { id: "review-feedback", label: "Review Feedback API", group: "Integracyjne" },
  { id: "plate-setup", label: "Plate Setup API", group: "Integracyjne" },
  { id: "loyalty-otp", label: "Loyalty OTP", group: "Integracyjne" },
  { id: "loyalty-collect", label: "Loyalty Collect", group: "Integracyjne" },
  { id: "loyalty-claim", label: "Loyalty Claim", group: "Integracyjne" },
  { id: "promo-send", label: "Promo Send", group: "Integracyjne" },
  { id: "promo-activate", label: "Promo Activate", group: "Integracyjne" },
  { id: "stripe-webhook", label: "Stripe Webhook", group: "Integracyjne" },
  { id: "db-subscriptions", label: "DB Subscriptions", group: "Unit DB" },
  { id: "db-plates", label: "DB Plates", group: "Unit DB" },
  { id: "db-loyalty", label: "DB Loyalty", group: "Unit DB" },
];

const GROUPS = ["Ogólne", "Integracyjne", "Unit DB"] as const;

type Status = "idle" | "running" | "passed" | "failed";

export default function TestRunner() {
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState<string>("");
  const [activeSuite, setActiveSuite] = useState<string>("");

  async function run(suiteId: string) {
    setActiveSuite(suiteId);
    setStatus("running");
    setOutput("");

    const res = await fetch("/api/dev/run-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suite: suiteId }),
    });

    const data = await res.json();
    setOutput(data.output);
    setStatus(data.passed ? "passed" : "failed");
  }

  const statusColors: Record<Status, string> = {
    idle: "bg-zinc-100 text-zinc-500",
    running: "bg-yellow-50 text-yellow-700 border-yellow-200",
    passed: "bg-green-50 text-green-700 border-green-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };

  const statusLabel: Record<Status, string> = {
    idle: "",
    running: `Uruchamianie: ${activeSuite}...`,
    passed: `PASSED — ${activeSuite}`,
    failed: `FAILED — ${activeSuite}`,
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Test Runner
        </h2>
        <p className="text-sm text-zinc-500">
          Uruchamia testy Vitest na serwerze i wyświetla wynik poniżej.
        </p>
      </div>

      {GROUPS.map((group) => (
        <div key={group}>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">
            {group}
          </p>
          <div className="flex flex-wrap gap-2">
            {SUITES.filter((s) => s.group === group).map((suite) => {
              const isActive = activeSuite === suite.id && status === "running";
              return (
                <button
                  key={suite.id}
                  onClick={() => run(suite.id)}
                  disabled={status === "running"}
                  className={[
                    "px-3 py-1.5 text-sm rounded-md border font-medium transition-colors",
                    isActive
                      ? "bg-yellow-100 border-yellow-300 text-yellow-800 cursor-wait"
                      : status === "running"
                      ? "opacity-40 cursor-not-allowed border-zinc-200 bg-white text-zinc-700"
                      : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  ].join(" ")}
                >
                  {isActive ? "⏳ " : "▶ "}
                  {suite.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {status !== "idle" && (
        <div
          className={[
            "rounded-lg border p-4 space-y-3",
            statusColors[status],
          ].join(" ")}
        >
          <div className="text-sm font-semibold">{statusLabel[status]}</div>
          {output && (
            <pre className="text-xs whitespace-pre-wrap font-mono bg-black/5 dark:bg-white/5 rounded p-3 max-h-96 overflow-y-auto leading-5">
              {output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
