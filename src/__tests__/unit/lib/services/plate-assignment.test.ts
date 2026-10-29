import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAssign, mockIssue } = vi.hoisted(() => ({ mockAssign: vi.fn(), mockIssue: vi.fn() }));
vi.mock("@/lib/db/plates", () => ({ assignPlateToSubscription: mockAssign }));
vi.mock("@/lib/services/activation", () => ({ issueActivationCode: mockIssue }));

import { assignPlateAndIssueCode } from "@/lib/services/plate-assignment";

beforeEach(() => {
  vi.clearAllMocks();
  mockIssue.mockResolvedValue(true);
});

describe("assignPlateAndIssueCode()", () => {
  it("assigns, then issues the activation code", async () => {
    mockAssign.mockResolvedValue(true);

    await expect(assignPlateAndIssueCode(7, 50)).resolves.toBe(true);
    expect(mockAssign).toHaveBeenCalledWith(7, 50);
    expect(mockIssue).toHaveBeenCalledWith(50);
  });

  it("a taken or missing plate returns false and sends NO activation code", async () => {
    mockAssign.mockResolvedValue(false);

    await expect(assignPlateAndIssueCode(7, 50)).resolves.toBe(false);
    expect(mockIssue).not.toHaveBeenCalled();
  });

  it("a database error propagates and sends no code", async () => {
    mockAssign.mockRejectedValue(new Error("db down"));

    await expect(assignPlateAndIssueCode(7, 50)).rejects.toThrow("db down");
    expect(mockIssue).not.toHaveBeenCalled();
  });
});
