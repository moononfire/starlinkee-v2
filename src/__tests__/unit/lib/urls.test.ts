import { describe, it, expect } from "vitest";
import { safeRedirectPath, isSafeHttpUrl, isSafeGoogleReviewUrl } from "@/lib/urls";

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

describe("isSafeGoogleReviewUrl()", () => {
  it.each([
    "https://search.google.com/local/writereview?placeid=ChIJabc",
    "https://g.page/r/abc/review",
    "https://maps.app.goo.gl/abc",
    "https://www.google.com/maps/place/x",
  ])("accepts %s", (u) => expect(isSafeGoogleReviewUrl(u)).toBe(true));

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "http://google.com/x",
    "https://evil.com/google.com",
    "https://google.com.evil.com/x",
    "https://evilgoogle.com/x",
    "https://user@evil.com/x",
    "https://google.com@evil.com/x",
    "",
    "not a url",
  ])("rejects %j", (u) => expect(isSafeGoogleReviewUrl(u)).toBe(false));
});
