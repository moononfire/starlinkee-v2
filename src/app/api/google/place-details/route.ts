import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  if (!rateLimit(`google-pd:${clientIp(request)}`, 15, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const placeId = request.nextUrl.searchParams.get("place_id");
  if (!placeId) {
    return NextResponse.json({ error: "Missing place_id" }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 500 }
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,formatted_address,url,place_id");
  url.searchParams.set("key", API_KEY);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== "OK" || !data.result) {
    return NextResponse.json(
      { error: "Place not found" },
      { status: 404 }
    );
  }

  const result = data.result;
  const reviewLink = `https://search.google.com/local/writereview?placeid=${result.place_id}`;

  return NextResponse.json({
    name: result.name ?? "",
    address: result.formatted_address ?? "",
    google_maps_url: result.url ?? "",
    google_review_link: reviewLink,
    place_id: result.place_id,
  });
}
