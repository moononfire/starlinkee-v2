import { NextRequest, NextResponse } from "next/server";
import { recordPageView } from "@/lib/db/page-views";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location_id, page_path, page_type, session_id } = body;

    if (!page_path || !page_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const referrer = request.headers.get("referer") ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;

    await recordPageView({
      location_id: location_id ?? null,
      page_path,
      page_type,
      referrer,
      user_agent: userAgent,
      session_id,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}
