import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { mockDeactivate } = vi.hoisted(() => ({ mockDeactivate: vi.fn() }));
vi.mock("@/lib/db/subscriptions", () => ({ deactivateExpiredSubscriptions: mockDeactivate }));

import { GET } from "@/app/api/cron/expire-subscriptions/route";

function req(authorization?: string) {
  return new NextRequest("http://localhost/api/cron/expire-subscriptions", {
    headers: authorization ? { authorization } : {},
  });
}

describe("GET /api/cron/expire-subscriptions", () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    mockDeactivate.mockReset().mockResolvedValue(3);
  });

  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("fails closed with 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req("Bearer undefined"));
    expect(res.status).toBe(500);
    expect(mockDeactivate).not.toHaveBeenCalled();
  });

  it("returns 401 for a missing or wrong secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect(mockDeactivate).not.toHaveBeenCalled();
  });

  it("runs the job for the correct secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deactivatedCount: 3 });
  });
});
