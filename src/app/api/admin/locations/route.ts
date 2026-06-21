import { NextRequest, NextResponse } from "next/server";
import { updateLocation, upsertLocationLinks } from "@/lib/db/locations";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { location_id, links, ...updates } = body;

  if (!location_id) {
    return NextResponse.json({ error: "location_id required" }, { status: 400 });
  }

  const location = await updateLocation(location_id, updates);

  if (Array.isArray(links)) {
    await upsertLocationLinks(location_id, links);
  }

  return NextResponse.json({ location });
}
