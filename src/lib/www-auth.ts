import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function checkWwwKey(request: NextRequest): NextResponse | null {
  const key = request.headers.get("X-WWW-Key");
  const expected = process.env.WWW_API_KEY;

  if (!expected) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!key || !safeCompare(key, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
