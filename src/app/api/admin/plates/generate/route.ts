import { NextRequest, NextResponse } from "next/server";
import { generateUniquePlateCodes } from "@/lib/db/plates";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const count = Math.min(parseInt(searchParams.get("count") ?? "10"), 500);
  const language = searchParams.get("language") ?? "en";

  if (!["en", "de", "pl"].includes(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  const codes = await generateUniquePlateCodes(count);
  const lines = codes.map((code) => `${code},${language}`);
  const content = lines.join("\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="plates_${count}_${language}.txt"`,
    },
  });
}
