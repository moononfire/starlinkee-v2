import { NextRequest, NextResponse } from "next/server";
import { recordPageView } from "@/lib/db/page-views";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const PAGE_TYPES = ["promo", "promo_claim", "linktree", "loyalty", "plate_scan"] as const;
const SESSION_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(`track-ip:${clientIp(request)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { location_id, page_path, page_type, session_id } = body;

    if (!page_path || !page_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (
      typeof page_path !== "string" ||
      page_path.length > 300 ||
      !page_path.startsWith("/") ||
      !PAGE_TYPES.includes(page_type) ||
      !(location_id === null || location_id === undefined || Number.isInteger(location_id)) ||
      !(session_id === undefined || session_id === "" || (typeof session_id === "string" && SESSION_ID_PATTERN.test(session_id)))
    ) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const referrer = request.headers.get("referer")?.slice(0, 500) ?? null;
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

    await recordPageView({
      location_id: location_id ?? null,
      page_path,
      page_type,
      referrer,
      user_agent: userAgent,
      session_id: session_id || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}
