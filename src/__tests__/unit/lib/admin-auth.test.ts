import { describe, it, expect, afterEach } from "vitest";
import { isAdminUser } from "@/lib/admin-auth";

const confirmed = "2026-01-01T00:00:00Z";
const originalAdminEmails = process.env.ADMIN_EMAILS;
const originalEmailAdmin = process.env.EMAIL_ADMIN;

afterEach(() => {
  if (originalAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = originalAdminEmails;
  if (originalEmailAdmin === undefined) delete process.env.EMAIL_ADMIN;
  else process.env.EMAIL_ADMIN = originalEmailAdmin;
});

describe("isAdminUser()", () => {
  it("grants admin by app_metadata.role", () => {
    expect(
      isAdminUser({ email: "a@x.pl", app_metadata: { role: "admin" }, email_confirmed_at: undefined })
    ).toBe(true);
  });

  it("grants admin for a confirmed email on the ADMIN_EMAILS allowlist (case-insensitive)", () => {
    process.env.ADMIN_EMAILS = "Boss@x.pl, other@x.pl";
    expect(isAdminUser({ email: "boss@x.pl", app_metadata: {}, email_confirmed_at: confirmed })).toBe(true);
  });

  it("denies an allowlisted email that is not confirmed", () => {
    process.env.ADMIN_EMAILS = "boss@x.pl";
    expect(isAdminUser({ email: "boss@x.pl", app_metadata: {}, email_confirmed_at: undefined })).toBe(false);
  });

  it("does not use EMAIL_ADMIN (notification mailbox) to grant admin", () => {
    delete process.env.ADMIN_EMAILS;
    process.env.EMAIL_ADMIN = "boss@x.pl";
    expect(isAdminUser({ email: "boss@x.pl", app_metadata: {}, email_confirmed_at: confirmed })).toBe(false);
  });

  it("denies everyone when nothing is configured, and null users", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminUser({ email: "a@x.pl", app_metadata: {}, email_confirmed_at: confirmed })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });
});
