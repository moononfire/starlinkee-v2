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
  mockCreateUser,
  mockGenerateRandomPassword,
  mockGetOrderId,
  mockOrderHasItems,
  mockOrderHasShipment,
  mockListSubsByInvoice,
  mockListSubsByStripeSub,
  mockSetSubscriptionActive,
  mockGetSubscriptionById,
  mockGetPlateById,
  mockAssignPlate,
  mockIssueCode,
  mockExtendSubscription,
  mockSetStripeId,
  mockSendRenewalConfirmation,
  mockSendRenewalAdmin,
  mockSendDuplicateAdmin,
  mockStripeSubRetrieve,
  mockSessionsList,
  mockSessionsExpire,
  mockSessionsCreate,
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
  mockCreateUser: vi.fn(),
  mockGenerateRandomPassword: vi.fn(),
  mockGetOrderId: vi.fn(),
  mockOrderHasItems: vi.fn(),
  mockOrderHasShipment: vi.fn(),
  mockListSubsByInvoice: vi.fn(),
  mockListSubsByStripeSub: vi.fn(),
  mockSetSubscriptionActive: vi.fn(),
  mockGetSubscriptionById: vi.fn(),
  mockGetPlateById: vi.fn(),
  mockAssignPlate: vi.fn(),
  mockIssueCode: vi.fn(),
  mockExtendSubscription: vi.fn(),
  mockSetStripeId: vi.fn(),
  mockSendRenewalConfirmation: vi.fn(),
  mockSendRenewalAdmin: vi.fn(),
  mockSendDuplicateAdmin: vi.fn(),
  mockStripeSubRetrieve: vi.fn(),
  mockSessionsList: vi.fn(),
  mockSessionsExpire: vi.fn(),
  mockSessionsCreate: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    subscriptions = { retrieve: mockStripeSubRetrieve };
    checkout = { sessions: { list: mockSessionsList, expire: mockSessionsExpire, create: mockSessionsCreate } };
    customers = { retrieve: vi.fn() };
  },
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
  getOrderIdByStripePaymentId: mockGetOrderId,
  orderHasItems: mockOrderHasItems,
  orderHasShipment: mockOrderHasShipment,
}));
vi.mock("@/lib/db/subscriptions", () => ({
  createSubscription: mockCreateSubscription,
  setSubscriptionActive: mockSetSubscriptionActive,
  extendSubscription: mockExtendSubscription,
  setSubscriptionStripeId: mockSetStripeId,
  getSubscriptionById: mockGetSubscriptionById,
  listSubscriptionsByStripeInvoice: mockListSubsByInvoice,
  listSubscriptionsByStripeSubscription: mockListSubsByStripeSub,
}));
vi.mock("@/lib/db/plates", () => ({
  assignPlateToSubscription: mockAssignPlate,
  getPlateById: mockGetPlateById,
}));
vi.mock("@/lib/services/activation", () => ({ issueActivationCode: mockIssueCode }));
vi.mock("@/lib/email", () => ({
  sendOrderConfirmationToAdmin: mockSendOrderConfirmationToAdmin,
  sendPortalCredentials: mockSendPortalCredentials,
  sendRenewalConfirmation: mockSendRenewalConfirmation,
  sendRenewalConfirmationToAdmin: mockSendRenewalAdmin,
  sendDuplicateStripeSubscriptionToAdmin: mockSendDuplicateAdmin,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
      },
    },
  }),
}));
vi.mock("@/lib/password", () => ({
  generateRandomPassword: mockGenerateRandomPassword,
}));

import {
  processInvoicePaymentSucceeded,
  processStripeInvoice,
  createRenewalCheckoutSession,
  RENEWAL_GRACE_DAYS,
} from "@/lib/services/stripe";

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
  mockCreateUser.mockResolvedValue({ error: null });
  mockGenerateRandomPassword.mockReturnValue("generated-password");
  mockGetOrderId.mockResolvedValue(null);
  mockOrderHasItems.mockResolvedValue(false);
  mockOrderHasShipment.mockResolvedValue(false);
  mockListSubsByInvoice.mockResolvedValue([]);
  mockListSubsByStripeSub.mockResolvedValue([]);
  mockSetSubscriptionActive.mockResolvedValue(undefined);
  mockGetSubscriptionById.mockResolvedValue(null);
  mockGetPlateById.mockResolvedValue(null);
  mockAssignPlate.mockResolvedValue(undefined);
  mockExtendSubscription.mockResolvedValue(undefined);
  mockSetStripeId.mockResolvedValue(undefined);
  mockSendRenewalConfirmation.mockResolvedValue(undefined);
  mockSendRenewalAdmin.mockResolvedValue(undefined);
  mockSendDuplicateAdmin.mockResolvedValue(undefined);
  mockStripeSubRetrieve.mockResolvedValue({ status: "canceled" });
  mockSessionsList.mockResolvedValue({ data: [] });
  mockSessionsExpire.mockResolvedValue({});
  mockSessionsCreate.mockResolvedValue({ url: "https://checkout.test/s" });
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

  it("sends a passwordless email when createUser reports the account already exists", async () => {
    mockCreateUser.mockResolvedValue({ error: { code: "email_exists", message: "A user with this email address has already been registered" } });

    await processInvoicePaymentSucceeded(makeInvoice());

    expect(mockSendPortalCredentials).toHaveBeenCalledWith(
      "test@example.com",
      "en",
      expect.objectContaining({ password: null })
    );
  });
});


describe("idempotency and resume", () => {
  it("does not create a second order for an invoice that already has one, and only fills in what is missing", async () => {
    mockGetOrderId.mockResolvedValue(100);
    mockOrderHasItems.mockResolvedValue(true);
    mockOrderHasShipment.mockResolvedValue(true);
    mockListSubsByInvoice.mockResolvedValue([{ subscription_id: 50 }]);

    await processInvoicePaymentSucceeded(makeInvoice());

    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockCreateOrderItem).not.toHaveBeenCalled();
    expect(mockCreateSubscription).not.toHaveBeenCalled();
    expect(mockCreateShipment).not.toHaveBeenCalled();
  });

  it("resumes after a partial failure: creates only the subscriptions that are still missing", async () => {
    mockGetOrderId.mockResolvedValue(100);
    mockOrderHasItems.mockResolvedValue(true);
    mockListSubsByInvoice.mockResolvedValue([{ subscription_id: 50 }]);
    const invoice = makeInvoice({
      lines: { data: [{ pricing: { price_details: { price: TEST_PRICE_ID } }, quantity: 3 }] },
    });

    await processInvoicePaymentSucceeded(invoice);

    expect(mockCreateSubscription).toHaveBeenCalledTimes(2);
    expect(mockCreateShipment).toHaveBeenCalledOnce();
  });

  it("links created subscriptions to the invoice and the Stripe subscription", async () => {
    await processInvoicePaymentSucceeded(
      makeInvoice({ parent: { subscription_details: { subscription: "sub_stripe_1", metadata: {} } } })
    );
    expect(mockCreateSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_invoice_id: "in_test123", stripe_subscription_id: "sub_stripe_1" })
    );
  });
});

describe("processStripeInvoice() routing by billing_reason", () => {
  const cycleInvoice = (extra: Record<string, unknown> = {}) =>
    makeInvoice({
      billing_reason: "subscription_cycle",
      parent: { subscription_details: { subscription: "sub_stripe_1", metadata: {} } },
      lines: {
        data: [{ pricing: { price_details: { price: TEST_PRICE_ID } }, quantity: 1, period: { end: 1_900_000_000 } }],
      },
      ...extra,
    });

  it("creates the order for subscription_create", async () => {
    await processStripeInvoice(makeInvoice({ billing_reason: "subscription_create" }));
    expect(mockCreateOrder).toHaveBeenCalledOnce();
  });

  it("does NOT create an order, subscriptions or shipment for subscription_cycle; extends the linked subscription to the paid-through date", async () => {
    mockListSubsByStripeSub.mockResolvedValue([{ subscription_id: 50, status: "active", duration_in_days: 365 }]);

    await processStripeInvoice(cycleInvoice());

    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockCreateSubscription).not.toHaveBeenCalled();
    expect(mockCreateShipment).not.toHaveBeenCalled();
    expect(mockSetSubscriptionActive).toHaveBeenCalledWith(
      50,
      expect.any(String),
      new Date(1_900_000_000 * 1000).toISOString()
    );
  });

  it("leaves pending (never set up) subscriptions alone on a cycle", async () => {
    mockListSubsByStripeSub.mockResolvedValue([{ subscription_id: 50, status: "pending", duration_in_days: 365 }]);
    await processStripeInvoice(cycleInvoice());
    expect(mockSetSubscriptionActive).not.toHaveBeenCalled();
  });

  it("ignores unpaid invoices and unknown billing reasons", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await processStripeInvoice(makeInvoice({ billing_reason: "subscription_create", status: "open" }));
    await processStripeInvoice(makeInvoice({ billing_reason: "subscription_update" }));
    expect(mockCreateOrder).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  describe("renewal checkout for a plate without a subscription (renewal_plate_id)", () => {
    const renewal = (reason: string) =>
      makeInvoice({
        billing_reason: reason,
        parent: {
          subscription_details: {
            subscription: "sub_stripe_9",
            metadata: { renewal_plate_id: "7", plate_number: "ABCDEF", renewal_duration_days: "30", renewal_interval: "month" },
          },
        },
        lines: { data: [{ period: { end: 1_900_000_000 } }] },
      });

    it("first invoice creates the subscription and assigns the plate", async () => {
      await processStripeInvoice(renewal("subscription_create"));
      expect(mockCreateSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ stripe_subscription_id: "sub_stripe_9", stripe_invoice_id: "in_test123" })
      );
      expect(mockAssignPlate).toHaveBeenCalledWith(7, 50);
    });

    it("each later cycle extends the original subscription and never creates one or moves the plate", async () => {
      mockListSubsByStripeSub.mockResolvedValue([{ subscription_id: 50, status: "active" }]);

      await processStripeInvoice(renewal("subscription_cycle"));

      expect(mockCreateSubscription).not.toHaveBeenCalled();
      expect(mockAssignPlate).not.toHaveBeenCalled();
      expect(mockExtendSubscription).toHaveBeenCalledWith(50, expect.any(String));
      expect(mockSetSubscriptionActive).not.toHaveBeenCalled(); // activation_datetime untouched
    });

    it("falls back to the plate's current subscription for renewals created before Stripe ids were stored", async () => {
      mockGetPlateById.mockResolvedValue({ plate_id: 7, subscription_id: 33 });
      mockGetSubscriptionById.mockResolvedValue({ subscription_id: 33, status: "active" });

      await processStripeInvoice(renewal("subscription_cycle"));

      expect(mockExtendSubscription).toHaveBeenCalledWith(33, expect.any(String));
      expect(mockCreateSubscription).not.toHaveBeenCalled();
      expect(mockAssignPlate).not.toHaveBeenCalled();
    });

    it("a retried first invoice does not create a second subscription when everything is already in place", async () => {
      mockListSubsByInvoice.mockResolvedValue([{ subscription_id: 50, status: "pending", activation_code_hash: "h" }]);
      mockGetPlateById.mockResolvedValue({ plate_id: 7, subscription_id: 50 });
      await processStripeInvoice(renewal("subscription_create"));
      expect(mockCreateSubscription).not.toHaveBeenCalled();
      expect(mockAssignPlate).not.toHaveBeenCalled();
      expect(mockIssueCode).not.toHaveBeenCalled();
    });

    it("resumes a first attempt that died after createSubscription: attaches the plate and issues the code", async () => {
      // 1st attempt: subscription created, then assign throws
      mockAssignPlate.mockRejectedValueOnce(new Error("db down"));
      await expect(processStripeInvoice(renewal("subscription_create"))).rejects.toThrow("db down");
      expect(mockCreateSubscription).toHaveBeenCalledTimes(1);

      // Stripe retries: the subscription for this invoice now exists, the plate is not attached yet
      mockListSubsByInvoice.mockResolvedValue([{ subscription_id: 50, status: "pending", activation_code_hash: null }]);
      mockGetPlateById.mockResolvedValue({ plate_id: 7, subscription_id: null });
      mockAssignPlate.mockResolvedValue(undefined);

      await processStripeInvoice(renewal("subscription_create"));

      expect(mockCreateSubscription).toHaveBeenCalledTimes(1); // no second subscription
      expect(mockAssignPlate).toHaveBeenLastCalledWith(7, 50);
      expect(mockIssueCode).toHaveBeenCalledWith(50);
    });
  });
});


// ── Renewal of an existing (lapsed) subscription: period, grace, duplicates (F3, F4) ──
describe("renewal of an existing subscription (renewal_subscription_id)", () => {
  const DAY = 86_400_000;
  const PERIOD_END_31D = 1_900_000_000; // seconds
  const withGrace = (sec: number) => new Date(sec * 1000 + RENEWAL_GRACE_DAYS * DAY).toISOString();

  const renewal = (reason: string, extra: { periodEnd?: number | null; stripeSub?: string } = {}) =>
    makeInvoice({
      billing_reason: reason,
      parent: {
        subscription_details: {
          subscription: extra.stripeSub ?? "sub_new",
          metadata: {
            renewal_subscription_id: "50",
            plate_number: "ABCDEF",
            renewal_duration_days: "30",
            renewal_interval: "month",
            plate_language: "pl",
          },
        },
      },
      lines: { data: extra.periodEnd === null ? [] : [{ period: { end: extra.periodEnd ?? PERIOD_END_31D } }] },
    });

  it("has a grace period of 2 days", () => {
    expect(RENEWAL_GRACE_DAYS).toBe(2);
  });

  it("first invoice: active until the end of the PAID period (a 31-day month, not now+30d) plus grace", async () => {
    mockGetSubscriptionById.mockResolvedValue({ subscription_id: 50, status: "inactive", stripe_subscription_id: null });

    await processStripeInvoice(renewal("subscription_create"));

    expect(mockSetSubscriptionActive).toHaveBeenCalledWith(50, expect.any(String), withGrace(PERIOD_END_31D));
  });

  it("falls back to now + duration + grace when Stripe reports no period", async () => {
    mockGetSubscriptionById.mockResolvedValue({ subscription_id: 50, status: "inactive" });
    const before = Date.now();

    await processStripeInvoice(renewal("subscription_create", { periodEnd: null }));

    const expiration = new Date(mockSetSubscriptionActive.mock.calls[0][2]).getTime();
    expect(expiration).toBeGreaterThanOrEqual(before + (30 + RENEWAL_GRACE_DAYS) * DAY);
    expect(expiration).toBeLessThanOrEqual(Date.now() + (30 + RENEWAL_GRACE_DAYS) * DAY);
  });

  it("first invoice emails the customer and the admin, and records the Stripe subscription id", async () => {
    mockGetSubscriptionById.mockResolvedValue({ subscription_id: 50, status: "inactive", stripe_subscription_id: null });

    await processStripeInvoice(renewal("subscription_create"));

    expect(mockSendRenewalConfirmation).toHaveBeenCalledOnce();
    expect(mockSendRenewalAdmin).toHaveBeenCalledOnce();
    expect(mockSetStripeId).toHaveBeenCalledWith(50, "sub_new");
    expect(mockSendDuplicateAdmin).not.toHaveBeenCalled();
  });

  it("later cycle: only moves the end date; no activation change, no emails", async () => {
    mockGetSubscriptionById.mockResolvedValue({
      subscription_id: 50,
      status: "active",
      expiration_datetime: new Date(PERIOD_END_31D * 1000 - 40 * DAY).toISOString(),
    });

    await processStripeInvoice(renewal("subscription_cycle"));

    expect(mockExtendSubscription).toHaveBeenCalledWith(50, withGrace(PERIOD_END_31D));
    expect(mockSetSubscriptionActive).not.toHaveBeenCalled();
    expect(mockSendRenewalConfirmation).not.toHaveBeenCalled();
    expect(mockSendRenewalAdmin).not.toHaveBeenCalled();
  });

  it("later cycle never shortens time that was already granted (late or replayed invoice)", async () => {
    const granted = new Date(PERIOD_END_31D * 1000 + 90 * DAY).toISOString();
    mockGetSubscriptionById.mockResolvedValue({ subscription_id: 50, status: "active", expiration_datetime: granted });

    await processStripeInvoice(renewal("subscription_cycle"));

    expect(mockExtendSubscription).toHaveBeenCalledWith(50, granted);
  });

  it("later cycle reactivates a lapsed subscription (payment arrived after the cron)", async () => {
    mockGetSubscriptionById.mockResolvedValue({
      subscription_id: 50,
      status: "inactive",
      expiration_datetime: new Date(Date.now() - DAY).toISOString(),
    });

    await processStripeInvoice(renewal("subscription_cycle"));

    expect(mockExtendSubscription).toHaveBeenCalledWith(50, withGrace(PERIOD_END_31D));
  });

  it("later cycle leaves a never-set-up (pending) subscription alone", async () => {
    mockGetSubscriptionById.mockResolvedValue({ subscription_id: 50, status: "pending" });
    await processStripeInvoice(renewal("subscription_cycle"));
    expect(mockExtendSubscription).not.toHaveBeenCalled();
  });

  it("a second live Stripe subscription for the same row alerts the admin (and cancels nothing)", async () => {
    mockGetSubscriptionById.mockResolvedValue({ subscription_id: 50, status: "inactive", stripe_subscription_id: "sub_old" });
    mockStripeSubRetrieve.mockResolvedValue({ status: "active" });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    await processStripeInvoice(renewal("subscription_create", { stripeSub: "sub_new" }));

    expect(mockStripeSubRetrieve).toHaveBeenCalledWith("sub_old");
    expect(mockSendDuplicateAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 50,
        previousStripeSubscriptionId: "sub_old",
        newStripeSubscriptionId: "sub_new",
        plateNumber: "ABCDEF",
      })
    );
    expect(mockSetStripeId).toHaveBeenCalledWith(50, "sub_new");
    expect(mockSetSubscriptionActive).toHaveBeenCalled(); // the paid renewal is still honoured
    err.mockRestore();
  });

  it("no alert when the previous Stripe subscription is already canceled", async () => {
    mockGetSubscriptionById.mockResolvedValue({ subscription_id: 50, status: "inactive", stripe_subscription_id: "sub_old" });
    mockStripeSubRetrieve.mockResolvedValue({ status: "canceled" });

    await processStripeInvoice(renewal("subscription_create", { stripeSub: "sub_new" }));

    expect(mockSendDuplicateAdmin).not.toHaveBeenCalled();
    expect(mockSetStripeId).toHaveBeenCalledWith(50, "sub_new");
  });

  it("alerts when the previous subscription cannot be looked up (better a false alarm than a silent double charge)", async () => {
    mockGetSubscriptionById.mockResolvedValue({ subscription_id: 50, status: "inactive", stripe_subscription_id: "sub_old" });
    mockStripeSubRetrieve.mockRejectedValue(new Error("network"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    await processStripeInvoice(renewal("subscription_create", { stripeSub: "sub_new" }));

    expect(mockSendDuplicateAdmin).toHaveBeenCalledOnce();
    err.mockRestore();
  });

  it("same Stripe subscription again: nothing to record or alert", async () => {
    mockGetSubscriptionById.mockResolvedValue({ subscription_id: 50, status: "inactive", stripe_subscription_id: "sub_new" });

    await processStripeInvoice(renewal("subscription_create", { stripeSub: "sub_new" }));

    expect(mockSetStripeId).not.toHaveBeenCalled();
    expect(mockStripeSubRetrieve).not.toHaveBeenCalled();
  });
});

describe("createRenewalCheckoutSession() — one open renewal session per subscription (F4)", () => {
  const params = { subscriptionId: 50, plateNumber: "ABCDEF", returnUrl: "https://app/x", lang: "pl", interval: "month" as const };

  beforeEach(() => {
    process.env.STRIPE_PRICE_ID_RENEWAL_MONTHLY = "price_m";
    process.env.STRIPE_PRICE_ID_RENEWAL_YEARLY = "price_y";
    process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
  });

  it("expires this subscription's earlier open sessions (and only those) before creating the new one", async () => {
    mockSessionsList.mockResolvedValue({
      data: [
        { id: "cs_mine_month", metadata: { renewal_subscription_id: "50" } },
        { id: "cs_other_sub", metadata: { renewal_subscription_id: "51" } },
        { id: "cs_no_meta", metadata: {} },
      ],
    });

    await createRenewalCheckoutSession(params);

    expect(mockSessionsList).toHaveBeenCalledWith(expect.objectContaining({ status: "open" }));
    expect(mockSessionsExpire).toHaveBeenCalledTimes(1);
    expect(mockSessionsExpire).toHaveBeenCalledWith("cs_mine_month");
    expect(mockSessionsExpire.mock.invocationCallOrder[0]).toBeLessThan(mockSessionsCreate.mock.invocationCallOrder[0]);
  });

  it("tags the new session with the subscription id so it can be found later", async () => {
    await createRenewalCheckoutSession(params);
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { renewal_subscription_id: "50" } })
    );
  });

  it("still creates the session when listing/expiring fails", async () => {
    mockSessionsList.mockRejectedValue(new Error("stripe down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(createRenewalCheckoutSession(params)).resolves.toBe("https://checkout.test/s");
    err.mockRestore();
  });
});
