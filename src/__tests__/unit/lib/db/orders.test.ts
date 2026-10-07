import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import { createOrder, createOrderItem, createShipment, listOrders } from "@/lib/db/orders";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createOrder()", () => {
  const orderData = {
    customer_id: 1,
    status: "paid" as const,
    payment_method: "stripe" as const,
    stripe_payment_id: "in_test123",
    fulfilled_at: new Date().toISOString(),
  };

  it("returns order_id on success", async () => {
    supabaseMock.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { order_id: 7 }, error: null }),
        })),
      })),
    });

    const result = await createOrder(orderData);
    expect(result).toBe(7);
  });

  it("throws when Supabase returns an error", async () => {
    supabaseMock.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "db error" } }),
        })),
      })),
    });

    await expect(createOrder(orderData)).rejects.toThrow("Failed to create order");
  });
});

describe("createOrderItem()", () => {
  it("inserts without throwing on success", async () => {
    supabaseMock.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    await expect(createOrderItem(7, 2, 3)).resolves.toBeUndefined();
  });

  it("throws when Supabase returns an error", async () => {
    supabaseMock.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: "constraint violation" } }),
    });

    await expect(createOrderItem(7, 2, 3)).rejects.toThrow("Failed to create order item");
  });
});

describe("createShipment()", () => {
  it("inserts without throwing on success", async () => {
    supabaseMock.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    await expect(
      createShipment({ order_id: 7, recipient_name: "Jan Kowalski", city: "Warszawa" })
    ).resolves.toBeUndefined();
  });

  it("throws when Supabase returns an error", async () => {
    supabaseMock.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: "shipment error" } }),
    });

    await expect(createShipment({ order_id: 7 })).rejects.toThrow("Failed to create shipment");
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("listOrders()", () => {
  function setup(opts: { customers?: any[]; customersError?: any; orders?: any[]; ordersError?: any } = {}) {
    const customersOr = vi.fn().mockResolvedValue({
      data: opts.customers ?? [],
      error: opts.customersError ?? null,
    });
    const ordersResult = { data: opts.orders ?? [], error: opts.ordersError ?? null };
    const ordersOr = vi.fn().mockResolvedValue(ordersResult);
    const order = vi.fn(() => ({ or: ordersOr, then: (res: any, rej: any) => Promise.resolve(ordersResult).then(res, rej) }));
    supabaseMock.from.mockImplementation((table: string) =>
      table === "customers"
        ? { select: vi.fn(() => ({ or: customersOr })) }
        : { select: vi.fn(() => ({ order })) }
    );
    return { customersOr, ordersOr };
  }

  it.each([undefined, "", "   "])("applies no filter for q=%j", async (q) => {
    const { customersOr, ordersOr } = setup();
    await listOrders(q);
    expect(customersOr).not.toHaveBeenCalled();
    expect(ordersOr).not.toHaveBeenCalled();
    expect(supabaseMock.from).not.toHaveBeenCalledWith("customers");
  });

  it("searches customers, then filters by payment references or matching customer ids", async () => {
    const { customersOr, ordersOr } = setup({ customers: [{ customer_id: 3 }, { customer_id: 7 }] });
    await listOrders("jan");
    expect(customersOr).toHaveBeenCalledWith('customer_name.ilike."%jan%",email.ilike."%jan%"');
    expect(ordersOr).toHaveBeenCalledWith(
      'stripe_payment_id.ilike."%jan%",internal_payment_reference.ilike."%jan%",customer_id.in.(3,7)'
    );
  });

  it("omits the customer_id.in clause when no customer matches", async () => {
    const { ordersOr } = setup({ customers: [] });
    await listOrders("pi_123");
    expect(ordersOr).toHaveBeenCalledWith(
      'stripe_payment_id.ilike."%pi\\\\_123%",internal_payment_reference.ilike."%pi\\\\_123%"'
    );
  });

  it("quotes and escapes special characters without throwing", async () => {
    const { customersOr, ordersOr } = setup();
    await expect(listOrders('a,b(c)%_"\\')).resolves.toEqual([]);
    const v = '"%a,b(c)\\\\%\\\\_\\"\\\\\\\\%"';
    expect(customersOr).toHaveBeenCalledWith(`customer_name.ilike.${v},email.ilike.${v}`);
    expect(ordersOr).toHaveBeenCalledWith(
      `stripe_payment_id.ilike.${v},internal_payment_reference.ilike.${v}`
    );
  });

  it("throws when the customers lookup fails", async () => {
    setup({ customersError: { message: "boom" } });
    await expect(listOrders("jan")).rejects.toThrow("Failed to list orders");
  });

  it("throws when the orders query fails", async () => {
    setup({ ordersError: { message: "boom" } });
    await expect(listOrders("jan")).rejects.toThrow("Failed to list orders");
  });
});
