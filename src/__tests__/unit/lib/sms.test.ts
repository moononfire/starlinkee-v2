import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendSms } from "@/lib/sms";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true });
});

describe("sendSms()", () => {
  it("uses default sender number for +48 phone numbers", async () => {
    await sendSms("+48600000000", "Test message");

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.from).toBe(process.env.HTTPSMS_SENDER_NUMBER);
    expect(body.to).toBe("+48600000000");
    expect(body.content).toBe("Test message");
  });

  it("uses default sender number for non-PL phone numbers", async () => {
    await sendSms("+12025550001", "Hello");

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.from).toBe(process.env.HTTPSMS_SENDER_NUMBER);
  });

  it("sends correct API key header", async () => {
    await sendSms("+12025550001", "Hello");

    const call = mockFetch.mock.calls[0];
    expect(call[1].headers["x-api-key"]).toBe(process.env.HTTPSMS_API_KEY);
  });

  it("posts to the correct httpsms endpoint", async () => {
    await sendSms("+12025550001", "Hello");

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe("https://api.httpsms.com/v1/messages/send");
  });

  it("throws when API returns a non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => "error" });

    await expect(sendSms("+48600000000", "Test")).rejects.toThrow("httpsms error 500");
  });
});
