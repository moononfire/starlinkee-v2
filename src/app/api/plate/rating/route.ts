import { NextRequest, NextResponse } from "next/server";
import { updateRating, getRedirectFourStarReviews } from "@/lib/db/reviews";

export async function POST(request: NextRequest) {
  const { scanId, rating } = await request.json();

  if (!scanId || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await updateRating(scanId, rating);
  } catch (err) {
    if (err instanceof Error && err.message === "Rating already submitted") {
      const { existingRating } = err as Error & { existingRating: number };
      return NextResponse.json({ error: "already_rated", rating: existingRating }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }

  const redirectFourStar = rating === 4 ? await getRedirectFourStarReviews(scanId) : false;
  return NextResponse.json({ redirectToGoogle: rating === 5 || redirectFourStar });
}
