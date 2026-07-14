import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const {
  mockUpsertCustomerByEmail,
  mockGetCustomerById,
  mockCreateOrder,
  mockCreateOrderItem,
  mockCreateShipment,
  mockCreateSubscription,
  mockSendOrderConfirmationToAdmin,
  mockGetCustomerByEmail,
  mockSendPortalCredentials,
  mockListUsers,
  mockCreateUser,
  mockGenerateRandomPassword,
} = vi.hoisted(() => ({
  mockUpsertCustomerByEmail: vi.fn(),
  mockGetCustomerById: vi.fn(),
  mockCreateOrder: vi.fn(),
  mockCreateOrderItem: vi.fn(),
  mockCreateShipment: vi.fn(),
  mockCreateSubscription: vi.fn(),
  mockSendOrderConfirmationToAdmin: vi.fn(),
  mockGetCustomerByEmail: vi.fn(),
  mockSendPortalCredentials: vi.fn(),
  mockListUsers: vi.fn(),
  mockCreateUser: vi.fn(),
  mockGenerateRandomPassword: vi.fn(),
}));

vi.mock("@/lib/db/customers", () => ({
  upsertCustomerByEmail: mockUpsertCustomerByEmail,
  getCustomerById: mockGetCustomerById,
}));
vi.mock("@/lib/db/portal", () => ({
  getCustomerByEmail: mockGetCustomerByEmail,
}));
vi.mock("@/lib/db/orders", () => ({
  createOrder: mockCreateOrder,
  createOrderItem: mockCreateOrderItem,
  createShipment: mockCreateShipment,
}));
vi.mock("@/lib/db/subscriptions", () => ({ createSubscription: mockCreateSubscription }));
vi.mock("@/lib/email", () => ({
  sendOrderConfirmationToAdmin: mockSendOrderConfirmationToAdmin,
  sendPortalCredentials: mockSendPortalCredentials,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        listUsers: mockListUsers,
        createUser: mockCreateUser,
      },
    },
  }),
}));
vi.mock("@/lib/password", () => ({
  generateRandomPassword: mockGenerateRandomPassword,
}));

import { processInvoicePaymentSucceeded } from "@/lib/services/stripe";

const TEST_PRICE_ID = "price_test_1year";

function makeInvoice(overrides: Record<string, unknown> = {}): Stripe.Invoice {
  return {
    id: "in_test123",
    customer_email: "test@example.com",
    customer_name: "Test User",
    customer_phone: null,
    customer_address: null,
    customer_shipping: null,
    customer_tax_ids: [],
    payments: { data: [] },
    lines: {
      data: [
        {
          pricing: { price_details: { price: TEST_PRICE_ID } },
          quantity: 1,
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Invoice;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_PRICE_ID_1_YEAR_SUB = TEST_PRICE_ID;
  mockUpsertCustomerByEmail.mockResolvedValue(1);
  mockGetCustomerById.mockResolvedValue({ customer_id: 1, preferred_language: "en" });
  mockCreateOrder.mockResolvedValue(100);
  mockCreateOrderItem.mockResolvedValue(undefined);
  mockCreateShipment.mockResolvedValue(undefined);
  mockCreateSubscription.mockResolvedValue({ subscription_id: 50 });
  mockSendOrderConfirmationToAdmin.mockResolvedValue(undefined);
  mockGetCustomerByEmail.mockResolvedValue(null);
  mockSendPortalCredentials.mockResolvedValue(undefined);
  mockListUsers.mockResolvedValue({ data: { users: [] } });
  mockCreateUser.mockResolvedValue({ error: null });
  mockGenerateRandomPassword.mockReturnValue("generated-password");
});

describe("processInvoicePaymentSucceeded()", () => {
  it("creates customer, order, order items, subscription, and shipment on happy path", async () => {
    await processInvoicePaymentSucceeded(makeInvoice());

    expect(mockUpsertCustomerByEmail).toHaveBeenCalledOnce();
    expect(mockUpsertCustomerByEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test@example.com" })
    );
    expect(mockCreateOrder).toHaveBeenCalledOnce();
    expect(mockCreateOrderItem).toHaveBeenCalledTimes(2); // SUBSCRIPTION + PLATE items
    expect(mockCreateSubscription).toHaveBeenCalledOnce();
    expect(mockCreateShipment).toHaveBeenCalledOnce();
  });

  it("skips all processing when invoice has no customer_email", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await processInvoicePaymentSucceeded(makeInvoice({ customer_email: null }));

    expect(mockUpsertCustomerByEmail).not.toHaveBeenCalled();
    expect(mockCreateOrder).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("creates no subscriptions or order items when priceId is unknown", async () => {
    const invoice = makeInvoice({
      lines: {
        data: [
          {
            pricing: { price_details: { price: "price_unknown_xyz" } },
            quantity: 1,
          },
        ],
      },
    });

    await processInvoicePaymentSucceeded(invoice);

    expect(mockCreateSubscription).not.toHaveBeenCalled();
    expect(mockCreateOrderItem).not.toHaveBeenCalled();
  });

  it("creates a subscription for each unit when quantity > 1", async () => {
    const invoice = makeInvoice({
      lines: {
        data: [
          {
            pricing: { price_details: { price: TEST_PRICE_ID } },
            quantity: 3,
          },
        ],
      },
    });

    await processInvoicePaymentSucceeded(invoice);

    expect(mockCreateSubscription).toHaveBeenCalledTimes(3);
  });

  it("passes customer_id and order_id to createOrder", async () => {
    await processInvoicePaymentSucceeded(makeInvoice());

    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: 1, status: "paid", payment_method: "stripe" })
    );
  });

  it("sends admin notification after processing", async () => {
    await processInvoicePaymentSucceeded(makeInvoice());

    expect(mockSendOrderConfirmationToAdmin).toHaveBeenCalledOnce();
    expect(mockSendOrderConfirmationToAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 100, customerEmail: "test@example.com" })
    );
  });

  it("creates a portal account with a generated password and emails the credentials when none exists", async () => {
    mockListUsers.mockResolvedValue({ data: { users: [] } });

    await processInvoicePaymentSucceeded(makeInvoice());

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
        password: "generated-password",
        email_confirm: true,
      })
    );
    expect(mockSendPortalCredentials).toHaveBeenCalledOnce();
    expect(mockSendPortalCredentials).toHaveBeenCalledWith(
      "test@example.com",
      "en",
      expect.objectContaining({ password: "generated-password" })
    );
  });

  it("skips account creation and sends a passwordless email when the account already exists", async () => {
    mockListUsers.mockResolvedValue({ data: { users: [{ email: "test@example.com" }] } });

    await processInvoicePaymentSucceeded(makeInvoice());

    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockSendPortalCredentials).toHaveBeenCalledWith(
      "test@example.com",
      "en",
      expect.objectContaining({ password: null })
    );
  });
});
