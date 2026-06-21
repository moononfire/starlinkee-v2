import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input");
  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 500 }
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  );
  url.searchParams.set("input", input);
  url.searchParams.set("types", "establishment");
  url.searchParams.set("key", API_KEY);

  const res = await fetch(url.toString());
  const data = await res.json();

  const predictions = (data.predictions ?? []).map(
    (p: { place_id: string; description: string }) => ({
      place_id: p.place_id,
      description: p.description,
    })
  );

  return NextResponse.json({ predictions });
}
