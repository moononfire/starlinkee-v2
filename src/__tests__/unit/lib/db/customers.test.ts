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
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    });

    const result = await upsertCustomerByEmail(customerData);
    expect(result).toBe(42);
  });

  it("never overwrites an existing customer's data, only fills empty fields", async () => {
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              customer_id: 42,
              customer_name: "Real Owner",
              customer_type: "individual",
              tax_id: "PL111",
              billing_address: null,
              phone: "",
              is_activated: false,
            },
          }),
        })),
      })),
      update,
    });

    await upsertCustomerByEmail({
      ...customerData,
      customer_name: "Attacker",
      tax_id: "PL999",
      billing_address: "New street 1",
      phone: "+48600000000",
      is_activated: true,
    });

    expect(update).toHaveBeenCalledWith({
      billing_address: "New street 1",
      phone: "+48600000000",
      is_activated: true,
    });
  });

  it("does not write at all when nothing is missing", async () => {
    const update = vi.fn();
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { customer_id: 42, customer_name: "Real Owner", customer_type: "business", is_activated: true },
          }),
        })),
      })),
      update,
    });

    await upsertCustomerByEmail({ ...customerData, customer_name: "Attacker" });
    expect(update).not.toHaveBeenCalled();
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
