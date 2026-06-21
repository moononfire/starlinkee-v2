import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/db/page-views";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const days = Math.min(Number(params.get("days")) || 30, 365);
  const location_id = params.get("location_id")
    ? Number(params.get("location_id"))
    : undefined;
  const page_type = params.get("page_type") || undefined;

  const data = await getAnalyticsData({ days, location_id, page_type });
  return NextResponse.json(data);
}
