import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();

    let facebook = null;
    let instagram = null;
    let menuLink = null;

    const hrefRegex = /href=["']([^"']+)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const link = match[1];
      const lower = link.toLowerCase();

      if (!facebook && (lower.includes("facebook.com") || lower.includes("fb.me"))) {
        facebook = link;
      }
      if (!instagram && lower.includes("instagram.com")) {
        instagram = link;
      }
      if (!menuLink && (lower.includes("menu") || lower.includes("karta-dan") || lower.includes("karta"))) {
        if (link.startsWith("/")) {
           const baseUrl = new URL(url);
           menuLink = `${baseUrl.origin}${link}`;
        } else if (link.startsWith("http")) {
           menuLink = link;
        }
      }
    }

    return NextResponse.json({ facebook, instagram, menuLink });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch information" }, { status: 500 });
  }
}
