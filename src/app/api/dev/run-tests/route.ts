import { exec } from "child_process";

const SUITES: Record<string, string> = {
  all: "",
  unit: "src/__tests__/unit",
  integration: "src/__tests__/integration",
  "plate-rating": "src/__tests__/integration/api/plate-rating.test.ts",
  "review-feedback": "src/__tests__/integration/api/review-feedback.test.ts",
  "plate-setup": "src/__tests__/integration/api/plate-setup.test.ts",
  "loyalty-otp": "src/__tests__/integration/api/loyalty-request-otp.test.ts",
  "loyalty-collect": "src/__tests__/integration/api/loyalty-collect.test.ts",
  "loyalty-claim": "src/__tests__/integration/api/loyalty-claim.test.ts",
  "promo-send": "src/__tests__/integration/api/promo-send.test.ts",
  "promo-activate": "src/__tests__/integration/api/promo-activate.test.ts",
  "stripe-webhook": "src/__tests__/integration/api/stripe-webhook.test.ts",
  "db-subscriptions": "src/__tests__/unit/lib/db/subscriptions.test.ts",
  "db-plates": "src/__tests__/unit/lib/db/plates.test.ts",
  "db-loyalty": "src/__tests__/unit/lib/db/loyalty.test.ts",
};

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json(
      { passed: false, output: "Test runner działa tylko lokalnie (NODE_ENV=development).\nUruchom testy przez: npm test" },
      { status: 403 }
    );
  }

  const { suite } = await request.json().catch(() => ({ suite: "all" }));
  const filter = SUITES[suite as string] ?? "";
  const isWindows = process.platform === "win32";
  const vitestBin = isWindows
    ? "node_modules\\.bin\\vitest.cmd"
    : "node node_modules/.bin/vitest";
  const cmd = `${vitestBin} run ${filter} --reporter=verbose`;

  return new Promise<Response>((resolve) => {
    exec(
      cmd,
      { cwd: process.cwd(), timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const output = (stdout + "\n" + stderr).trim();
        const passed = !error;
        resolve(Response.json({ passed, output }));
      }
    );
  });
}
