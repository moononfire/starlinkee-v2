import { NextRequest, NextResponse } from "next/server";
import { updateRating } from "@/lib/db/reviews";

export async function POST(request: NextRequest) {
  const { scanId, rating } = await request.json();

  if (!scanId || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await updateRating(scanId, rating);
  } catch {
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }

  return NextResponse.json({ redirectToGoogle: rating >= 4 });
}
