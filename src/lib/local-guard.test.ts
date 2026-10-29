import { describe, it, expect } from "vitest";
import { assertLocalSupabase, isLocalSupabaseUrl } from "../../scripts/local-guard.mjs";

describe("local Supabase guard", () => {
  it("accepts local URLs", () => {
    for (const u of ["http://127.0.0.1:56321", "http://localhost:54321", "http://[::1]:54321"]) {
      expect(isLocalSupabaseUrl(u)).toBe(true);
      expect(() => assertLocalSupabase(u, "t")).not.toThrow();
    }
  });

  it("refuses the remote project and look-alike hosts", () => {
    for (const u of [
      "https://sntsftkutpcppszbyjeq.supabase.co",
      "https://localhost.evil.com",
      "http://127.0.0.1.evil.com",
      "https://evil.com/127.0.0.1",
    ]) {
      expect(() => assertLocalSupabase(u, "t")).toThrow(/odmowa startu/);
    }
  });

  it("refuses a missing or malformed URL", () => {
    expect(() => assertLocalSupabase(undefined, "t")).toThrow(/odmowa startu/);
    expect(() => assertLocalSupabase("not a url", "t")).toThrow(/odmowa startu/);
  });
});
