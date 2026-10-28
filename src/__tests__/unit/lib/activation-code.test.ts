import { describe, it, expect } from "vitest";
import {
  generateActivationCode,
  hashActivationCode,
  verifyActivationCode,
  formatActivationCode,
} from "@/lib/activation-code";

describe("activation code", () => {
  it("generates 8 readable characters", () => {
    const code = generateActivationCode();
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
  });

  it("verifies regardless of case, dashes and spaces", () => {
    const hash = hashActivationCode("ABCDEFGH");
    expect(verifyActivationCode("abcd-efgh", hash)).toBe(true);
    expect(verifyActivationCode(" ABCD EFGH ", hash)).toBe(true);
    expect(verifyActivationCode(formatActivationCode("ABCDEFGH"), hash)).toBe(true);
  });

  it("rejects wrong, missing and non-string codes and missing hashes", () => {
    const hash = hashActivationCode("ABCDEFGH");
    expect(verifyActivationCode("ABCDEFGJ", hash)).toBe(false);
    expect(verifyActivationCode("", hash)).toBe(false);
    expect(verifyActivationCode(null, hash)).toBe(false);
    expect(verifyActivationCode(new File([], "x"), hash)).toBe(false);
    expect(verifyActivationCode("ABCDEFGH", null)).toBe(false);
  });
});
