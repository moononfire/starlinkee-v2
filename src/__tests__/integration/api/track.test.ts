import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRecord } = vi.hoisted(() => ({ mockRecord: vi.fn() }));
vi.mock("@/lib/db/page-views", () => ({ recordPageView: mockRecord }));

import { POST } from "@/app/api/track/route";
import { resetRateLimits } from "@/lib/rate-limit";

const req = (body: unknown) =>
  new NextRequest("http://localhost/api/track", { method: "POST", body: JSON.stringify(body) });

const valid = { location_id: 3, page_path: "/l/cafe", page_type: "linktree", session_id: "6f1f6c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f" };

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  mockRecord.mockResolvedValue(undefined);
});

describe("POST /api/track", () => {
  it("records a valid page view", async () => {
    expect((await POST(req(valid))).status).toBe(200);
    expect(mockRecord).toHaveBeenCalledOnce();
  });

  it.each([
    ["unknown page_type", { ...valid, page_type: "<script>" }],
    ["path not starting with /", { ...valid, page_path: "https://evil" }],
    ["oversized path", { ...valid, page_path: "/" + "a".repeat(400) }],
    ["non-integer location", { ...valid, location_id: "1; drop" }],
    ["bad session id", { ...valid, session_id: "x".repeat(200) }],
  ])("rejects %s", async (_name, body) => {
    expect((await POST(req(body))).status).toBe(400);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("rate limits a single IP", async () => {
    for (let i = 0; i < 120; i++) await POST(req(valid));
    expect((await POST(req(valid))).status).toBe(429);
  });
});
