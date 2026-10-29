import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import { upsertCustomerByEmail, listCustomers } from "@/lib/db/customers";

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
        ilike: vi.fn(() => ({
          order: () => ({ limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { customer_id: 42 } }) }) }),
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
        ilike: vi.fn(() => ({
          order: () => ({ limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({
            data: {
              customer_id: 42,
              customer_name: "Real Owner",
              customer_type: "individual",
              tax_id: "PL111",
              billing_address: null,
              phone: "",
              is_activated: false,
            },
          }) }) }),
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
        ilike: vi.fn(() => ({
          order: () => ({ limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({
            data: { customer_id: 42, customer_name: "Real Owner", customer_type: "business", is_activated: true },
          }) }) }),
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
            ilike: vi.fn(() => ({
              order: () => ({ limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }),
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
            ilike: vi.fn(() => ({
              order: () => ({ limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }),
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

describe("upsertCustomerByEmail() e-mail normalization", () => {
  it("looks the customer up case-insensitively and stores the trimmed, lowercased address", async () => {
    const ilike = vi.fn(() => ({
      order: () => ({ limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }),
    }));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { customer_id: 7 }, error: null }) })),
    }));
    supabaseMock.from
      .mockReturnValueOnce({ select: vi.fn(() => ({ ilike })) })
      .mockReturnValueOnce({ insert });

    await upsertCustomerByEmail({ ...customerData, email: "  Jan.Kowalski@Firma.PL " });

    expect(ilike).toHaveBeenCalledWith("email", "jan.kowalski@firma.pl");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ email: "jan.kowalski@firma.pl" }));
  });

  it("escapes LIKE wildcards in the address so it is matched exactly", async () => {
    const ilike = vi.fn(() => ({
      order: () => ({ limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { customer_id: 3 } }) }) }),
    }));
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ ilike })),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    });

    await upsertCustomerByEmail({ ...customerData, email: "a_b%c@x.com" });

    expect(ilike).toHaveBeenCalledWith("email", "a\\_b\\%c@x.com");
  });
});

describe("listCustomers() search", () => {
  it("quotes the term so commas/parentheses cannot add PostgREST filters", async () => {
    const orFn = vi.fn().mockResolvedValue({ data: [], error: null });
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ order: vi.fn(() => ({ or: orFn })) })),
    });

    await listCustomers('x,id.gt.0)"');

    const filter = orFn.mock.calls[0][0] as string;
    // the term sits inside a double-quoted value (with its own quote escaped), once per column
    expect(filter).toContain('customer_name.ilike."%x,id.gt.0)\\"%"');
    expect(filter).toContain('email.ilike."%x,id.gt.0)\\"%"');
    expect(filter).toContain('company_name.ilike."%x,id.gt.0)\\"%"');
  });
});
