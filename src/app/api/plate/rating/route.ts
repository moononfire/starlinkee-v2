import { NextRequest, NextResponse } from "next/server";
import { isPositiveRating } from "@/lib/review-rating";
import { updateRating, getRedirectFourStarReviews } from "@/lib/db/reviews";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { scanId, rating } = body ?? {};

  if (!scanId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await updateRating(scanId, rating);
  } catch (err) {
    if (err instanceof Error && err.message === "Rating already submitted") {
      const { existingRating } = err as Error & { existingRating: number };
      const positive = isPositiveRating(existingRating, await getRedirectFourStarReviews(scanId));
      return NextResponse.json({ error: "already_rated", rating: existingRating, positive }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }

  const redirectFourStar = rating === 4 ? await getRedirectFourStarReviews(scanId) : false;
  return NextResponse.json({ redirectToGoogle: isPositiveRating(rating, redirectFourStar) });
}
