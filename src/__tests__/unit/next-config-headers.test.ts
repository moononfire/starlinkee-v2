import { describe, it, expect } from "vitest";
import nextConfig from "../../../next.config";

type Rule = { source: string; headers: { key: string; value: string }[] };

async function rules(): Promise<Rule[]> {
  return (await nextConfig.headers!()) as Rule[];
}

/** Which header values apply to a path, mimicking Next's matching for the sources we use. */
function headersFor(all: Rule[], path: string) {
  const out: Record<string, string[]> = {};
  for (const rule of all) {
    const matches =
      rule.source === "/:path*" ||
      (rule.source.startsWith("/((?!") && new RegExp(`^${rule.source}$`).test(path)) ||
      (rule.source.endsWith("/:path*") && path.startsWith(rule.source.replace(":path*", "")));
    if (!matches) continue;
    for (const h of rule.headers) (out[h.key] ??= []).push(h.value);
  }
  return out;
}

describe("security headers", () => {
  it.each(["/portal/dashboard", "/admin/dashboard", "/verify", "/login", "/api/stripe/webhook"])(
    "%s cannot be framed by anyone",
    async (path) => {
      const h = headersFor(await rules(), path);
      expect(h["X-Frame-Options"]).toEqual(["DENY"]);
      expect(h["Content-Security-Policy"]).toEqual(["frame-ancestors 'none'"]);
    }
  );

  it.each(["/plate/TJRUAO/secret", "/plate/TJRUAO/scan/abc", "/l/my-cafe", "/l/my-cafe/promo"])(
    "%s may be embedded only by the app itself and the marketing site",
    async (path) => {
      const h = headersFor(await rules(), path);
      expect(h["X-Frame-Options"]).toBeUndefined();
      expect(h["Content-Security-Policy"]).toHaveLength(1);
      expect(h["Content-Security-Policy"][0]).toBe(
        "frame-ancestors 'self' https://starlinkee.com https://www.starlinkee.com"
      );
    }
  );

  it("sends the baseline headers everywhere", async () => {
    const h = headersFor(await rules(), "/plate/X/y");
    expect(h["X-Content-Type-Options"]).toEqual(["nosniff"]);
    expect(h["Referrer-Policy"]).toEqual(["strict-origin-when-cross-origin"]);
  });
});
