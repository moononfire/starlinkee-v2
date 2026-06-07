import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { generateUniquePlateCodes } from "@/lib/db/plates";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
