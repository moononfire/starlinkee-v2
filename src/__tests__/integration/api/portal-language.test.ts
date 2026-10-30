import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockUpdateCustomer } = vi.hoisted(() => ({ mockSession: vi.fn(), mockUpdateCustomer: vi.fn() }));

vi.mock("@/lib/portal-session", () => ({ getPortalSession: mockSession }));
vi.mock("@/lib/db/customers", () => ({ updateCustomer: mockUpdateCustomer }));

import { POST } from "@/app/api/portal/language/route";

const req = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/portal/language", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers,
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.mockResolvedValue({ user: { id: "u" }, customer: { customer_id: 4 }, subscriptions: [] });
  mockUpdateCustomer.mockResolvedValue({});
});

describe("POST /api/portal/language", () => {
  it.each(["en", "de", "pl", "it"])("saves %s on the signed-in customer", async (lang) => {
    const res = await POST(req({ lang }));
    expect(res.status).toBe(200);
    expect(mockUpdateCustomer).toHaveBeenCalledWith(4, { preferred_language: lang });
  });

  it.each([{ lang: "zh" }, { lang: "xx" }, { lang: 5 }, {}, "not json"])("400 for an unsupported language (%j)", async (body) => {
    const res = await POST(req(body));
    expect(res.status).toBe(400);
    expect(mockUpdateCustomer).not.toHaveBeenCalled();
  });

  it("401 without a portal session", async () => {
    mockSession.mockResolvedValue({ user: null, customer: null, subscriptions: [] });
    expect((await POST(req({ lang: "de" }))).status).toBe(401);
    expect(mockUpdateCustomer).not.toHaveBeenCalled();
  });

  it("401 for a signed-in user without a customer", async () => {
    mockSession.mockResolvedValue({ user: { id: "u" }, customer: null, subscriptions: [] });
    expect((await POST(req({ lang: "de" }))).status).toBe(401);
  });

  it("403 for a foreign origin", async () => {
    expect((await POST(req({ lang: "de" }, { origin: "https://evil.example" }))).status).toBe(403);
    expect(mockUpdateCustomer).not.toHaveBeenCalled();
  });

  it("500 when the save fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUpdateCustomer.mockRejectedValue(new Error("db down"));
    expect((await POST(req({ lang: "de" }))).status).toBe(500);
    spy.mockRestore();
  });
});
