import { NextRequest, NextResponse } from "next/server";

export function checkMobileKey(request: NextRequest): NextResponse | null {
  const key = request.headers.get("X-Mobile-Key");
  const expected = process.env.MOBILE_API_KEY;

  if (!expected) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
