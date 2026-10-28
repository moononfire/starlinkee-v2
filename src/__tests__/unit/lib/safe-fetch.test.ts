import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLookup } = vi.hoisted(() => ({ mockLookup: vi.fn() }));
vi.mock("dns/promises", () => ({ lookup: mockLookup }));

import { isPrivateAddress, fetchPublicHtml } from "@/lib/safe-fetch";

describe("isPrivateAddress()", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"])(
    "treats %s as private",
    (a) => expect(isPrivateAddress(a)).toBe(true)
  );
  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"])("treats %s as public", (a) =>
    expect(isPrivateAddress(a)).toBe(false)
  );
});

describe("fetchPublicHtml()", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLookup.mockReset().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });

  it("rejects http, credentials and literal private IPs without fetching", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    await expect(fetchPublicHtml("http://example.com")).rejects.toThrow();
    await expect(fetchPublicHtml("https://user:pw@example.com")).rejects.toThrow();
    await expect(fetchPublicHtml("https://169.254.169.254/latest/meta-data")).rejects.toThrow();
    await expect(fetchPublicHtml("https://127.0.0.1")).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects a hostname that resolves to a private address", async () => {
    mockLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    await expect(fetchPublicHtml("https://internal.example.com")).rejects.toThrow("non-public");
  });

  it("re-validates redirect targets", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "https://169.254.169.254/" } })
    );
    await expect(fetchPublicHtml("https://example.com")).rejects.toThrow("non-public");
  });

  it("returns the body of a public page", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>ok</html>", { status: 200 }));
    expect(await fetchPublicHtml("https://example.com")).toBe("<html>ok</html>");
  });
});
