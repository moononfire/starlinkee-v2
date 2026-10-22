import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetPlate, mockAssign } = vi.hoisted(() => ({ mockGetPlate: vi.fn(), mockAssign: vi.fn() }));
vi.mock("@/lib/db/plates", () => ({ getPlateByNumber: mockGetPlate, assignNfcToPlate: mockAssign }));

import { POST as assignNfc } from "@/app/api/mobile/plates/assign-nfc/route";
import { GET as getPlate } from "@/app/api/mobile/plates/[plate_number]/route";

const key = { "X-Mobile-Key": "test-mobile-key" };
const post = (body: unknown) =>
  new NextRequest("http://localhost/api/mobile/plates/assign-nfc", { method: "POST", headers: key, body: JSON.stringify(body) });

const basePlate = { plate_number: "ABCDEF", secret_key: "s3cret", subscription_id: 42, plate_language: "pl", nfc_uid: null, nfc_assigned_at: null };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MOBILE_API_KEY = "test-mobile-key";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
  mockAssign.mockResolvedValue(true);
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("POST /api/mobile/plates/assign-nfc", () => {
  it("tags an untagged plate (also one that already has a subscription) and returns the URL to write", async () => {
    mockGetPlate.mockResolvedValue(basePlate);
    const res = await assignNfc(post({ plate_number: "ABCDEF", nfc_uid: "04:AA" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ nfc_url: "https://app.test/plate/ABCDEF/s3cret" });
    expect(mockAssign).toHaveBeenCalledWith("ABCDEF", "04:AA");
  });

  it("logs every assignment", async () => {
    mockGetPlate.mockResolvedValue(basePlate);
    await assignNfc(post({ plate_number: "ABCDEF", nfc_uid: "04:AA" }));
    const line = JSON.parse((console.info as unknown as { mock: { calls: string[][] } }).mock.calls[0][0]);
    expect(line).toMatchObject({ event: "nfc_assigned", plate_number: "ABCDEF", nfc_uid: "04:AA" });
  });

  it("returns 409 (and no secret) when a parallel request tagged the plate first", async () => {
    mockGetPlate.mockResolvedValue(basePlate);
    mockAssign.mockResolvedValue(false);
    const res = await assignNfc(post({ plate_number: "ABCDEF", nfc_uid: "04:AA" }));
    expect(res.status).toBe(409);
    expect(JSON.stringify(await res.json())).not.toContain("s3cret");
  });

  it("lets the same tag retry shortly after assignment (chip write failed)", async () => {
    mockGetPlate.mockResolvedValue({ ...basePlate, nfc_uid: "04:AA", nfc_assigned_at: new Date(Date.now() - 60_000).toISOString() });
    const res = await assignNfc(post({ plate_number: "ABCDEF", nfc_uid: "04:AA" }));
    expect(res.status).toBe(200);
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it("does NOT return the secret for a plate tagged long ago, or tagged before timestamps existed", async () => {
    for (const nfc_assigned_at of [new Date(Date.now() - 3_600_000).toISOString(), null]) {
      mockGetPlate.mockResolvedValue({ ...basePlate, nfc_uid: "04:AA", nfc_assigned_at });
      const res = await assignNfc(post({ plate_number: "ABCDEF", nfc_uid: "04:AA" }));
      expect(res.status).toBe(409);
      expect(JSON.stringify(await res.json())).not.toContain("s3cret");
    }
  });

  it("returns 409 for a different tag", async () => {
    mockGetPlate.mockResolvedValue({ ...basePlate, nfc_uid: "04:AA", nfc_assigned_at: new Date().toISOString() });
    expect((await assignNfc(post({ plate_number: "ABCDEF", nfc_uid: "04:BB" }))).status).toBe(409);
  });
});

describe("GET /api/mobile/plates/[plate_number]", () => {
  it("reports whether the plate is tagged but never returns the real UID", async () => {
    mockGetPlate.mockResolvedValue({ ...basePlate, nfc_uid: "04:AA" });
    const res = await getPlate(new NextRequest("http://localhost/x", { headers: key }), { params: Promise.resolve({ plate_number: "ABCDEF" }) });
    const body = await res.json();
    expect(body.tagged).toBe(true);
    expect(body.nfc_uid).toBe("tagged"); // non-null marker for older app versions, never the real UID
    expect(JSON.stringify(body)).not.toContain("04:AA");
  });
});
