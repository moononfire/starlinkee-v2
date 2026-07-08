import { NextRequest, NextResponse } from "next/server";
import { updateLocation, upsertLocationLinks } from "@/lib/db/locations";
import { requireAdmin } from "@/lib/api-auth";
import { isSafeHttpUrl } from "@/lib/urls";

export async function PUT(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json();
  const { location_id, links, ...updates } = body;

  if (!location_id) {
    return NextResponse.json({ error: "location_id required" }, { status: 400 });
  }

  if (Array.isArray(links)) {
    const badLink = links.find((l) => !isSafeHttpUrl(String(l?.url ?? "")));
    if (badLink) {
      return NextResponse.json(
        { error: "Link URLs must start with http:// or https://" },
        { status: 400 }
      );
    }
  }

  const location = await updateLocation(location_id, updates);

  if (Array.isArray(links)) {
    await upsertLocationLinks(location_id, links);
  }

  return NextResponse.json({ location });
}
