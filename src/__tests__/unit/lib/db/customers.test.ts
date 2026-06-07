import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import { upsertCustomerByEmail } from "@/lib/db/customers";

const customerData = {
  customer_type: "business" as const,
  source: "Stripe",
  customer_name: "Acme Corp",
  email: "acme@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("upsertCustomerByEmail()", () => {
  it("returns existing customer_id when email already exists", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { customer_id: 42 } }),
        })),
      })),
    });

    const result = await upsertCustomerByEmail(customerData);
    expect(result).toBe(42);
  });

  it("inserts a new customer and returns its customer_id when not found", async () => {
    let callCount = 0;
    supabaseMock.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null }),
            })),
          })),
        };
      }
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { customer_id: 99 }, error: null }),
          })),
        })),
      };
    });

    const result = await upsertCustomerByEmail(customerData);
    expect(result).toBe(99);
  });

  it("throws when the insert fails", async () => {
    let callCount = 0;
    supabaseMock.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null }),
            })),
          })),
        };
      }
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "unique violation" } }),
          })),
        })),
      };
    });

    await expect(upsertCustomerByEmail(customerData)).rejects.toThrow("Failed to create customer");
  });
});
