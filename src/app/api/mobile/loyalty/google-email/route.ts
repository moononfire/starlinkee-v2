import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Confirms the access token really came from a completed Supabase/Google
// OAuth session and returns the email — Google isn't the enforced identity
// here (phone is), but we don't want a client to just hand us an arbitrary
// email string to store.
export async function POST(request: NextRequest) {
  const { accessToken } = await request.json().catch(() => ({}));
  if (!accessToken || typeof accessToken !== "string") {
    return NextResponse.json({ error: "Missing accessToken" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user || !data.user.email) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  return NextResponse.json({ email: data.user.email });
}
