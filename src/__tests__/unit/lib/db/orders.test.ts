import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import { createOrder, createOrderItem, createShipment } from "@/lib/db/orders";

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
