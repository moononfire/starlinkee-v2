// Single source of truth for "this rating sends the guest to Google".
// Used by the rating API and by the scan page when a guest comes back.
export function isPositiveRating(rating: number, redirectFourStar: boolean): boolean {
  return rating === 5 || (rating === 4 && redirectFourStar);
}
