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

/** select().ilike().order() resolving to the given rows (the lookup returns every ilike match, then picks the exact one). */
const matching = (rows: unknown[]) => ({ order: vi.fn().mockResolvedValue({ data: rows }) });

describe("upsertCustomerByEmail()", () => {
  it("returns existing customer_id when email already exists", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        ilike: vi.fn(() => ({
          ...matching([{ customer_id: 42, email: "acme@example.com" }]),
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
          ...matching([{
              email: "acme@example.com",
              customer_id: 42,
              customer_name: "Real Owner",
              customer_type: "individual",
              tax_id: "PL111",
              billing_address: null,
              phone: "",
              is_activated: false,
          }]),
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

  describe("preferred_language of an existing customer", () => {
    const run = async (existingLanguage: string | null) => {
      const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
      supabaseMock.from.mockReturnValue({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            ...matching([{ customer_id: 42, email: "acme@example.com", customer_name: "A", customer_type: "business", preferred_language: existingLanguage }]),
          })),
        })),
        update,
      });
      await upsertCustomerByEmail({ ...customerData, preferred_language: "it" });
      return update;
    };

    it("a language the customer already has is never overwritten", async () => {
      expect(await run("de")).not.toHaveBeenCalled();
    });

    it("an empty language is filled from the invoice", async () => {
      expect(await run(null)).toHaveBeenCalledWith({ preferred_language: "it" });
    });
  });

  it("does not write at all when nothing is missing", async () => {
    const update = vi.fn();
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        ilike: vi.fn(() => ({
          ...matching([
            { email: "acme@example.com", customer_id: 42, customer_name: "Real Owner", customer_type: "business", is_activated: true },
          ]),
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
              ...matching([]),
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
              ...matching([]),
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
      ...matching([]),
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
      ...matching([{ customer_id: 3, email: "a_b%c@x.com" }]),
    }));
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ ilike })),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    });

    await upsertCustomerByEmail({ ...customerData, email: "a_b%c@x.com" });

    expect(ilike).toHaveBeenCalledWith("email", "a\\_b\\%c@x.com");
  });
});

describe("upsertCustomerByEmail() never adopts a different address matched by a wildcard", () => {
  it("'*' cannot be used to hit another customer: the pattern has no wildcard star and rows are re-checked", async () => {
    const ilike = vi.fn(() => matching([{ customer_id: 1, email: "victim@evil.com" }]));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { customer_id: 8 }, error: null }) })),
    }));
    supabaseMock.from.mockReturnValueOnce({ select: vi.fn(() => ({ ilike })) }).mockReturnValueOnce({ insert });

    const id = await upsertCustomerByEmail({ ...customerData, email: "*@evil.com" });

    expect(ilike).toHaveBeenCalledWith("email", "_@evil.com");
    expect(id).toBe(8); // a new customer, not customer 1
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
