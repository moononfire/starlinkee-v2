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

import { spawnSync } from "node:child_process";
import {
  assertLocalOrConfirmedProd,
  assertNotProdUnlessConfirmed,
  projectRefFromUrl,
  PROD_PROJECT_REF,
} from "../../scripts/local-guard.mjs";

const PROD_URL = `https://${PROD_PROJECT_REF}.supabase.co`;
const ACK = "--i-know-this-is-prod";
const CONFIRM = `--confirm-project=${PROD_PROJECT_REF}`;

describe("assertLocalOrConfirmedProd", () => {
  it("extracts the project ref only from a supabase.co host", () => {
    expect(projectRefFromUrl(PROD_URL)).toBe(PROD_PROJECT_REF);
    expect(projectRefFromUrl(`https://${PROD_PROJECT_REF}.supabase.co.evil.com`)).toBeNull();
    expect(projectRefFromUrl("http://127.0.0.1:54321")).toBeNull();
    expect(projectRefFromUrl(undefined)).toBeNull();
  });

  it("lets a local URL through without flags", () => {
    expect(() => assertLocalOrConfirmedProd("http://127.0.0.1:54321", [], "t")).not.toThrow();
  });

  it("refuses a remote URL without flags, with one flag, and with a wrong ref", () => {
    for (const argv of [[], [ACK], [CONFIRM], [ACK, "--confirm-project=aaaaaaaaaaaaaaaaaaaa"], [ACK, "--confirm-project="]]) {
      expect(() => assertLocalOrConfirmedProd(PROD_URL, argv, "t")).toThrow(/odmowa startu/);
    }
  });

  it("allows prod only with both flags and a matching ref", () => {
    expect(() => assertLocalOrConfirmedProd(PROD_URL, [ACK, CONFIRM], "t")).not.toThrow();
    expect(() => assertLocalOrConfirmedProd(PROD_URL, [CONFIRM, ACK], "t")).not.toThrow();
  });

  it("refuses a URL whose ref cannot be determined, even with both flags", () => {
    expect(() => assertLocalOrConfirmedProd("https://evil.com", [ACK, CONFIRM], "t")).toThrow(/odmowa startu/);
    expect(() => assertLocalOrConfirmedProd(undefined, [ACK, CONFIRM], "t")).toThrow(/odmowa startu/);
  });
});

describe("assertNotProdUnlessConfirmed (db-push)", () => {
  const prodDb = `postgresql://postgres.${PROD_PROJECT_REF}:pw@aws-0-eu.pooler.supabase.com:5432/postgres`;
  const devDb = "postgresql://postgres.bbbbbbbbbbbbbbbbbbbb:pw@aws-0-eu.pooler.supabase.com:5432/postgres";

  it("passes a non-prod DB URL", () => {
    expect(() => assertNotProdUnlessConfirmed(devDb, [], "t")).not.toThrow();
  });

  it("refuses the prod ref without flags, with one flag, and with a wrong ref", () => {
    for (const argv of [[], [ACK], [CONFIRM], [ACK, "--confirm-project=bbbbbbbbbbbbbbbbbbbb"]]) {
      expect(() => assertNotProdUnlessConfirmed(prodDb, argv, "t")).toThrow(/odmowa startu/);
    }
  });

  it("allows prod with both correct flags", () => {
    expect(() => assertNotProdUnlessConfirmed(prodDb, [ACK, CONFIRM], "t")).not.toThrow();
  });
});

describe("cleanup-customers.mjs guard runs before any client or query", () => {
  const run = (url: string, args: string[]) =>
    spawnSync("node", ["scripts/cleanup-customers.mjs", ...args], {
      env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: "x" },
      encoding: "utf8",
      timeout: 20000,
    });

  it("exits 1 with the guard message on the prod URL without both flags", () => {
    for (const args of [[], [ACK], [ACK, "--confirm-project=aaaaaaaaaaaaaaaaaaaa"]]) {
      const r = run(PROD_URL, args);
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/odmowa startu/);
      expect(r.stdout).not.toMatch(/Zachowuję klienta/);
    }
  });
});
