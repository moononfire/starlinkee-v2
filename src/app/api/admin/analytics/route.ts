import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/db/page-views";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const params = request.nextUrl.searchParams;
  const days = Math.min(Number(params.get("days")) || 30, 365);
  const location_id = params.get("location_id")
    ? Number(params.get("location_id"))
    : undefined;
  const page_type = params.get("page_type") || undefined;

  const data = await getAnalyticsData({ days, location_id, page_type });
  return NextResponse.json(data);
}
