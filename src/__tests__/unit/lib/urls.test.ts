import { describe, it, expect } from "vitest";
import { safeRedirectPath, isSafeHttpUrl } from "@/lib/urls";

describe("safeRedirectPath()", () => {
  const fb = "/portal/dashboard";

  it("keeps same-site paths", () => {
    expect(safeRedirectPath("/portal/reset-password", fb)).toBe("/portal/reset-password");
    expect(safeRedirectPath("/portal/dashboard?x=1", fb)).toBe("/portal/dashboard?x=1");
  });

  it.each([
    "https://evil.tld",
    "//evil.tld",
    "/\\evil.tld",
    "/\t/evil.tld",
    "javascript:alert(1)",
    "evil.tld",
    "",
    null,
    undefined,
  ])("falls back for %j", (value) => {
    expect(safeRedirectPath(value as string | null | undefined, fb)).toBe(fb);
  });
});

describe("isSafeHttpUrl()", () => {
  it("allows only http(s)", () => {
    expect(isSafeHttpUrl("https://a.pl")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
  });
});
