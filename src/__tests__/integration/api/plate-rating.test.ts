import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockUpdateRating, mockGetRedirectFourStarReviews } = vi.hoisted(() => ({
  mockUpdateRating: vi.fn(),
  mockGetRedirectFourStarReviews: vi.fn(),
}));

vi.mock("@/lib/db/reviews", () => ({
  updateRating: mockUpdateRating,
  getRedirectFourStarReviews: mockGetRedirectFourStarReviews,
}));

import { POST } from "@/app/api/plate/rating/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/plate/rating", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockUpdateRating.mockReset();
  mockUpdateRating.mockResolvedValue(undefined);
  mockGetRedirectFourStarReviews.mockReset();
  mockGetRedirectFourStarReviews.mockResolvedValue(true);
});

describe("POST /api/plate/rating", () => {
  it("returns 400 when scanId is missing", async () => {
    const res = await POST(makeRequest({ rating: 4 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is missing", async () => {
    const res = await POST(makeRequest({ scanId: "scan-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for rating below 1", async () => {
    const res = await POST(makeRequest({ scanId: "scan-1", rating: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for rating above 5", async () => {
    const res = await POST(makeRequest({ scanId: "scan-1", rating: 6 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric rating", async () => {
    const res = await POST(makeRequest({ scanId: "scan-1", rating: "five" }));
    expect(res.status).toBe(400);
  });

  it("returns redirectToGoogle=false for rating <= 3", async () => {
    const res = await POST(makeRequest({ scanId: "scan-1", rating: 3 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.redirectToGoogle).toBe(false);
  });

  it("returns redirectToGoogle=true for rating >= 4", async () => {
    const res = await POST(makeRequest({ scanId: "scan-1", rating: 4 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.redirectToGoogle).toBe(true);
  });

  it("returns redirectToGoogle=true for rating 5", async () => {
    const res = await POST(makeRequest({ scanId: "scan-1", rating: 5 }));
    const body = await res.json();
    expect(body.redirectToGoogle).toBe(true);
  });

  it("returns 500 when updateRating throws", async () => {
    mockUpdateRating.mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest({ scanId: "scan-1", rating: 4 }));
    expect(res.status).toBe(500);
  });

  it("returns 409 with the existing rating when already rated", async () => {
    const err = new Error("Rating already submitted") as Error & { existingRating: number };
    err.existingRating = 5;
    mockUpdateRating.mockRejectedValue(err);

    const res = await POST(makeRequest({ scanId: "scan-1", rating: 3 }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toEqual({ error: "already_rated", rating: 5 });
  });

  it("calls updateRating with correct arguments", async () => {
    await POST(makeRequest({ scanId: "scan-42", rating: 2 }));
    expect(mockUpdateRating).toHaveBeenCalledWith("scan-42", 2);
  });
});
