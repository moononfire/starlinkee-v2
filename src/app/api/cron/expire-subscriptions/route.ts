import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { deactivateExpiredSubscriptions } from "@/lib/db/subscriptions";
import { cleanupRateLimits } from "@/lib/rate-limit-persistent";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!safeCompare(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deactivatedCount = await deactivateExpiredSubscriptions();
  // Housekeeping for the persistent rate limiter; never fails the job.
  await cleanupRateLimits().catch((err) => console.error("[cron] rate_limit_cleanup failed:", err));
  return NextResponse.json({ deactivatedCount });
}
