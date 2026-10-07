import { describe, it, expect } from "vitest";
import { hasOwnerReply } from "@/lib/review-thread";

describe("hasOwnerReply()", () => {
  it("is false for an empty list", () => {
    expect(hasOwnerReply([])).toBe(false);
  });

  it("is false when only the reporter has written", () => {
    expect(hasOwnerReply([{ sender: "reporter" }, { sender: "reporter" }])).toBe(false);
  });

  it("is true once the owner has written", () => {
    expect(hasOwnerReply([{ sender: "reporter" }, { sender: "owner" }])).toBe(true);
  });
});
