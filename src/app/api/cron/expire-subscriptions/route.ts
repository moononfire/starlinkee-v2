import { NextRequest, NextResponse } from "next/server";
import { deactivateExpiredSubscriptions } from "@/lib/db/subscriptions";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deactivatedCount = await deactivateExpiredSubscriptions();
  return NextResponse.json({ deactivatedCount });
}
