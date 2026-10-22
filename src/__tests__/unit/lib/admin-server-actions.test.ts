import { describe, it, expect, vi, beforeEach } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const { mockGetUser } = vi.hoisted(() => ({ mockGetUser: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}));

import { assertAdmin } from "@/lib/api-auth";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("assertAdmin()", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    process.env.ADMIN_EMAILS = "boss@x.pl";
  });

  it("throws without a session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(assertAdmin()).rejects.toThrow("Forbidden");
  });

  it("throws for a non-admin user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "user@x.pl", app_metadata: {}, email_confirmed_at: "2026-01-01" } },
    });
    await expect(assertAdmin()).rejects.toThrow("Forbidden");
  });

  it("passes for an admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "boss@x.pl", app_metadata: {}, email_confirmed_at: "2026-01-01" } },
    });
    await expect(assertAdmin()).resolves.toBeUndefined();
  });
});

describe("admin server actions", () => {
  it("every 'use server' function under src/app/admin calls assertAdmin() first", () => {
    const files = walk(join(process.cwd(), "src/app/admin")).filter((f) => /\.tsx?$/.test(f));
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/"use server";\n(\s*)(.*)/g)) {
        if (!m[2].startsWith("await assertAdmin()")) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
