import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
  mockSendInvalidCart,
  mockStripeSubRetrieve,
  mockCustomersRetrieve,
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
  mockSendInvalidCart: vi.fn(),
  mockStripeSubRetrieve: vi.fn(),
  mockCustomersRetrieve: vi.fn(),
  mockSessionsList: vi.fn(),
  mockSessionsExpire: vi.fn(),
  mockSessionsCreate: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    subscriptions = { retrieve: mockStripeSubRetrieve };
    checkout = { sessions: { list: mockSessionsList, expire: mockSessionsExpire, create: mockSessionsCreate } };
    customers = { retrieve: mockCustomersRetrieve };
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
  sendInvalidCartMetadataToAdmin: mockSendInvalidCart,
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
  processExtraPlatesPaymentIntent,
  isExtraPlatesPaymentIntent,
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
  mockCustomersRetrieve.mockResolvedValue({ deleted: false, metadata: {} });
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
  mockAssignPlate.mockResolvedValue(true);
  mockExtendSubscription.mockResolvedValue(undefined);
  mockSetStripeId.mockResolvedValue(undefined);
  mockSendRenewalConfirmation.mockResolvedValue(undefined);
  mockSendRenewalAdmin.mockResolvedValue(undefined);
  mockSendDuplicateAdmin.mockResolvedValue(undefined);
  mockSendInvalidCart.mockResolvedValue(undefined);
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


describe("www cart on the invoice (monthly/yearly subscription + extra plates)", () => {
  const MONTHLY = "price_www_month";
  const YEARLY = "price_www_year";
  const EXTRA = "price_www_extra";

  const cart = (...lines: Array<[string, number]>) =>
    makeInvoice({
      lines: {
        data: lines.map(([price, quantity]) => ({ pricing: { price_details: { price } }, quantity })),
      },
    } as unknown as Partial<Stripe.Invoice>);

  const createdDurations = () => mockCreateSubscription.mock.calls.map((c) => c[0].duration_in_days);

  beforeEach(() => {
    process.env.STRIPE_PRICE_ID_SUBSCRIPTION = MONTHLY;
    process.env.STRIPE_PRICE_ID_SUBSCRIPTION_YEARLY = YEARLY;
    process.env.STRIPE_PRICE_ID_EXTRA_PLATE = EXTRA;
  });

  afterEach(() => {
    delete process.env.STRIPE_PRICE_ID_SUBSCRIPTION;
    delete process.env.STRIPE_PRICE_ID_SUBSCRIPTION_YEARLY;
    delete process.env.STRIPE_PRICE_ID_EXTRA_PLATE;
  });

  it.each([
    [0, 1],
    [2, 3],
    [3, 4],
  ])("monthly with %i extra plates creates %i rows of 30 days", async (extra, rows) => {
    await processInvoicePaymentSucceeded(cart([MONTHLY, 1], ...(extra ? ([[EXTRA, extra]] as Array<[string, number]>) : [])));

    expect(createdDurations()).toEqual(Array(rows).fill(30));
    expect(mockCreateOrderItem).toHaveBeenCalledWith(100, 1, rows);
    expect(mockCreateOrderItem).toHaveBeenCalledWith(100, 2, rows);
  });

  it("yearly creates a 365-day row", async () => {
    await processInvoicePaymentSucceeded(cart([YEARLY, 1]));

    expect(createdDurations()).toEqual([365]);
  });

  it("legacy 1_YEAR_SUB price still gives 365 days", async () => {
    await processInvoicePaymentSucceeded(cart([TEST_PRICE_ID, 2]));

    expect(createdDurations()).toEqual([365, 365]);
  });

  it("redelivery of the same invoice creates no duplicates", async () => {
    mockGetOrderId.mockResolvedValue(100);
    mockOrderHasItems.mockResolvedValue(true);
    mockListSubsByInvoice.mockResolvedValue([{}, {}, {}]);

    await processInvoicePaymentSucceeded(cart([MONTHLY, 1], [EXTRA, 2]));

    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockCreateOrderItem).not.toHaveBeenCalled();
    expect(mockCreateSubscription).not.toHaveBeenCalled();
  });

  it("extra plates without a subscription line create nothing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await processInvoicePaymentSucceeded(cart([EXTRA, 2]));

    expect(mockCreateSubscription).not.toHaveBeenCalled();
    expect(mockCreateOrderItem).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("an unset price env name matches nothing (no line is counted by accident)", async () => {
    delete process.env.STRIPE_PRICE_ID_SUBSCRIPTION;
    delete process.env.STRIPE_PRICE_ID_1_YEAR_SUB;

    await processInvoicePaymentSucceeded(cart([MONTHLY, 1]));

    expect(mockCreateSubscription).not.toHaveBeenCalled();
  });
});

describe("language from www (metadata.locale), never from the billing country", () => {
  const withLocale = (subscriptionLocale?: string, extra: Partial<Stripe.Invoice> = {}) =>
    makeInvoice({
      customer: "cus_1",
      customer_address: { country: "IT" },
      parent: { subscription_details: { subscription: "sub_1", metadata: subscriptionLocale ? { locale: subscriptionLocale } : {} } },
      ...extra,
    } as unknown as Partial<Stripe.Invoice>);
  const savedLanguage = () => mockUpsertCustomerByEmail.mock.calls[0][0].preferred_language;
  const mailLanguage = () => mockSendPortalCredentials.mock.calls[0][1];

  // A new customer has no saved language yet (the default mock pretends the customer already speaks English).
  beforeEach(() => {
    mockGetCustomerById.mockResolvedValue({ customer_id: 1, preferred_language: null });
  });

  it("takes the locale from the subscription metadata without asking Stripe for the customer (cart metadata present too)", async () => {
    await processInvoicePaymentSucceeded(
      makeInvoice({
        customer: "cus_1",
        parent: { subscription_details: { subscription: "sub_1", metadata: { locale: "de", billing: "annual", total_plates: "1" } } },
      } as unknown as Partial<Stripe.Invoice>)
    );
    expect(savedLanguage()).toBe("de");
    expect(mockCustomersRetrieve).not.toHaveBeenCalled();
    expect(mailLanguage()).toBe("de");
  });

  it("falls back to the locale on the Stripe customer", async () => {
    mockCustomersRetrieve.mockResolvedValue({ deleted: false, metadata: { locale: "pl" } });
    await processInvoicePaymentSucceeded(withLocale());
    expect(savedLanguage()).toBe("pl");
    expect(mailLanguage()).toBe("pl");
  });

  it("without any locale the language stays empty (the Italian billing country is ignored) and the mail is English", async () => {
    await processInvoicePaymentSucceeded(withLocale());
    expect(savedLanguage()).toBeUndefined();
    expect(mailLanguage()).toBe("en");
  });

  it("a value outside en/de/pl/it is skipped", async () => {
    mockCustomersRetrieve.mockResolvedValue({ deleted: false, metadata: { locale: "fr" } });
    await processInvoicePaymentSucceeded(withLocale("zh"));
    expect(savedLanguage()).toBeUndefined();
  });

  it("a deleted Stripe customer does not break the invoice", async () => {
    mockCustomersRetrieve.mockResolvedValue({ deleted: true });
    await processInvoicePaymentSucceeded(withLocale());
    expect(mockCreateOrder).toHaveBeenCalledOnce();
  });

  it("an existing customer's saved language decides the mail, not the invoice locale", async () => {
    mockGetCustomerById.mockResolvedValue({ customer_id: 1, preferred_language: "de" });
    await processInvoicePaymentSucceeded(withLocale("it"));
    expect(mailLanguage()).toBe("de");
  });
});

describe("cart metadata from www (P27)", () => {
  const metaInvoice = (metadata: Record<string, string> | undefined, extra: Partial<Stripe.Invoice> = {}) =>
    makeInvoice({
      id: "in_meta",
      customer: "cus_meta",
      amount_paid: 4900,
      currency: "eur",
      parent: { subscription_details: { subscription: "sub_1", metadata: metadata ?? {} } },
      ...extra,
    } as unknown as Partial<Stripe.Invoice>);
  const durations = () => mockCreateSubscription.mock.calls.map((c) => c[0].duration_in_days);
  const nothingCreated = () => {
    expect(mockUpsertCustomerByEmail).not.toHaveBeenCalled();
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockCreateSubscription).not.toHaveBeenCalled();
    expect(mockCreateShipment).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    process.env.STRIPE_PRICE_ID_SUBSCRIPTION = "price_www_month";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    delete process.env.STRIPE_PRICE_ID_SUBSCRIPTION;
    vi.restoreAllMocks();
  });

  it("monthly with total_plates=3 makes 3 rows of 30 days, whatever the invoice lines say", async () => {
    await processInvoicePaymentSucceeded(metaInvoice({ billing: "monthly", total_plates: "3" }));
    expect(durations()).toEqual([30, 30, 30]);
    expect(mockCreateOrderItem).toHaveBeenCalledWith(100, 1, 3);
  });

  it("annual with total_plates=1 makes one row of 365 days", async () => {
    await processInvoicePaymentSucceeded(metaInvoice({ billing: "annual", total_plates: "1" }));
    expect(durations()).toEqual([365]);
  });

  it("trial uses trial_days, not the kind=subscription_yearly alias, and starts with the base plate only", async () => {
    await processInvoicePaymentSucceeded(
      metaInvoice({ billing: "trial", total_plates: "2", trial_days: "30", kind: "subscription_yearly", plates: "9" })
    );
    expect(durations()).toEqual([30]); // the extra plate is created from its own PaymentIntent (P28)
    expect(mockCreateOrderItem).toHaveBeenCalledWith(100, 1, 1);
  });

  it("reads the metadata from the Stripe customer when the subscription has none", async () => {
    mockCustomersRetrieve.mockResolvedValue({ deleted: false, metadata: { billing: "annual", total_plates: "2" } });
    await processInvoicePaymentSucceeded(metaInvoice(undefined));
    expect(durations()).toEqual([365, 365]);
  });

  it("without any billing metadata the price-id logic of P20 decides", async () => {
    await processInvoicePaymentSucceeded(
      makeInvoice({
        lines: { data: [{ pricing: { price_details: { price: "price_www_month" } }, quantity: 2 }] },
      } as unknown as Partial<Stripe.Invoice>)
    );
    expect(durations()).toEqual([30, 30]);
  });

  it.each([
    ["an unknown billing", { billing: "weekly", total_plates: "1" }, ["billing"]],
    ["total_plates=0", { billing: "monthly", total_plates: "0" }, ["total_plates"]],
    ["total_plates=abc", { billing: "annual", total_plates: "abc" }, ["total_plates"]],
    ["total_plates=51", { billing: "annual", total_plates: "51" }, ["total_plates"]],
    ["total_plates=1.5", { billing: "annual", total_plates: "1.5" }, ["total_plates"]],
    ["a trial without trial_days", { billing: "trial", total_plates: "1" }, ["trial_days"]],
    ["a missing total_plates", { billing: "monthly" }, ["total_plates"]],
  ])("%s creates nothing and alerts the admin once", async (_name, metadata, errors) => {
    await processInvoicePaymentSucceeded(metaInvoice(metadata));

    nothingCreated();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("in_meta"));
    expect(mockSendInvalidCart).toHaveBeenCalledOnce();
    expect(mockSendInvalidCart).toHaveBeenCalledWith({
      invoiceId: "in_meta",
      stripeCustomerId: "cus_meta",
      customerEmail: "test@example.com",
      amount: "49.00 EUR",
      errors,
    });
  });

  it("a failing alert e-mail does not fail the webhook", async () => {
    mockSendInvalidCart.mockRejectedValue(new Error("smtp down"));
    await expect(processInvoicePaymentSucceeded(metaInvoice({ billing: "weekly", total_plates: "1" }))).resolves.toBeUndefined();
    nothingCreated();
  });

  it("redelivery of an invoice with metadata creates no duplicates", async () => {
    mockGetOrderId.mockResolvedValue(100);
    mockOrderHasItems.mockResolvedValue(true);
    mockListSubsByInvoice.mockResolvedValue([{}, {}, {}]);
    await processInvoicePaymentSucceeded(metaInvoice({ billing: "monthly", total_plates: "3" }));
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockCreateOrderItem).not.toHaveBeenCalled();
    expect(mockCreateSubscription).not.toHaveBeenCalled();
  });
});

describe("extra plates PaymentIntent of a trial (P28)", () => {
  type Row = { subscription_id: number; customer_id: number; duration_in_days: number; stripe_subscription_id?: string; stripe_invoice_id?: string };
  let rows: Row[];
  let orders: Map<string, number>;

  const trialInvoice = () =>
    makeInvoice({
      id: "in_trial",
      customer: "cus_t",
      parent: { subscription_details: { subscription: "sub_trial", metadata: { billing: "trial", trial_days: "30", total_plates: "3" } } },
    } as unknown as Partial<Stripe.Invoice>);
  const pi = (metadata: Record<string, string> = {}, extra: Record<string, unknown> = {}) =>
    ({
      id: "pi_1",
      customer: "cus_t",
      amount: 5800,
      currency: "eur",
      created: Math.floor(Date.now() / 1000) - 60,
      receipt_email: "buyer@example.com",
      metadata: { purpose: "extra_plates_and_shipping", subscription_id: "sub_trial", extra_plates: "2", total_plates: "3", ...metadata },
      ...extra,
    }) as unknown as Stripe.PaymentIntent;

  beforeEach(() => {
    rows = [];
    orders = new Map();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateSubscription.mockImplementation(async (data: Omit<Row, "subscription_id">) => {
      const row = { subscription_id: 100 + rows.length, ...data };
      rows.push(row);
      return row;
    });
    mockListSubsByStripeSub.mockImplementation(async (id: string) => rows.filter((r) => r.stripe_subscription_id === id));
    mockListSubsByInvoice.mockImplementation(async (id: string) => rows.filter((r) => r.stripe_invoice_id === id));
    mockGetOrderId.mockImplementation(async (id: string) => orders.get(id) ?? null);
    mockCreateOrder.mockImplementation(async (data: { stripe_payment_id: string }) => {
      const id = 200 + orders.size;
      orders.set(data.stripe_payment_id, id);
      return id;
    });
    mockOrderHasItems.mockImplementation(async () => false);
    mockGetCustomerById.mockResolvedValue({ customer_id: 1, customer_name: "Buyer", email: "buyer@example.com", preferred_language: "de" });
    mockUpsertCustomerByEmail.mockResolvedValue(7);
  });
  afterEach(() => vi.restoreAllMocks());

  it("recognises only the extra-plates purpose", () => {
    expect(isExtraPlatesPaymentIntent(pi())).toBe(true);
    expect(isExtraPlatesPaymentIntent(pi({ purpose: "something_else" }))).toBe(false);
    expect(isExtraPlatesPaymentIntent({ metadata: {} } as unknown as Stripe.PaymentIntent)).toBe(false);
  });

  it("normal order: the trial invoice makes 1 row, the PaymentIntent tops up to 3 with the same customer and period", async () => {
    await processInvoicePaymentSucceeded(trialInvoice());
    expect(rows).toHaveLength(1);

    await processExtraPlatesPaymentIntent(pi());

    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.customer_id))).toEqual(new Set([7]));
    expect(rows.map((r) => r.duration_in_days)).toEqual([30, 30, 30]);
    expect(rows.slice(1).every((r) => r.stripe_invoice_id === undefined)).toBe(true);
    expect(mockCreateOrderItem).toHaveBeenCalledWith(expect.any(Number), 2, 2); // PLATE x extra_plates
    expect(mockSendOrderConfirmationToAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ plateCount: 2 }));
    expect(mockCreateShipment).toHaveBeenCalledOnce(); // only the invoice's order ships
  });

  it("reversed order: a PaymentIntent before its invoice throws and writes nothing; after the invoice the retry makes 3 rows", async () => {
    await expect(processExtraPlatesPaymentIntent(pi())).rejects.toThrow(/not created yet/);
    expect(rows).toHaveLength(0);
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockSendInvalidCart).not.toHaveBeenCalled();

    await processInvoicePaymentSucceeded(trialInvoice());
    await processExtraPlatesPaymentIntent(pi());

    expect(rows).toHaveLength(3);
  });

  it("redelivery of the PaymentIntent and of the invoice, in any order, keeps 3 rows and one order for the PI", async () => {
    await processInvoicePaymentSucceeded(trialInvoice());
    await processExtraPlatesPaymentIntent(pi());
    await processExtraPlatesPaymentIntent(pi());
    await processInvoicePaymentSucceeded(trialInvoice());
    await processExtraPlatesPaymentIntent(pi());

    expect(rows).toHaveLength(3);
    expect(orders.has("pi_1")).toBe(true);
    expect(mockCreateOrder.mock.calls.filter((c) => c[0].stripe_payment_id === "pi_1")).toHaveLength(1);
  });

  it.each([
    ["no subscription_id", { subscription_id: "" }, ["subscription_id"]],
    ["extra_plates=0", { extra_plates: "0" }, ["extra_plates"]],
    ["extra_plates=abc", { extra_plates: "abc" }, ["extra_plates"]],
    ["extra_plates=50", { extra_plates: "50" }, ["extra_plates"]],
  ])("%s creates nothing and alerts the admin", async (_n, metadata, errors) => {
    await processExtraPlatesPaymentIntent(pi(metadata));

    expect(mockCreateSubscription).not.toHaveBeenCalled();
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockSendInvalidCart).toHaveBeenCalledWith({
      source: "PaymentIntent",
      invoiceId: "pi_1",
      stripeCustomerId: "cus_t",
      customerEmail: "buyer@example.com",
      amount: "58.00 EUR",
      errors,
    });
  });

  it("a PaymentIntent older than 24 hours whose subscription never appeared alerts the admin and stops retries", async () => {
    const old = pi({}, { created: Math.floor(Date.now() / 1000) - 25 * 3600 });
    await expect(processExtraPlatesPaymentIntent(old)).resolves.toBeUndefined();
    expect(mockCreateSubscription).not.toHaveBeenCalled();
    expect(mockSendInvalidCart).toHaveBeenCalledOnce();
  });

  it("monthly and annual invoices are unchanged: one row per total_plates", async () => {
    await processInvoicePaymentSucceeded(
      makeInvoice({
        id: "in_m",
        parent: { subscription_details: { subscription: "sub_m", metadata: { billing: "monthly", total_plates: "3" } } },
      } as unknown as Partial<Stripe.Invoice>)
    );
    expect(rows).toHaveLength(3);
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

  it("does NOT create an order, subscriptions or shipment for subscription_cycle; extends the linked subscription to the paid-through date plus grace", async () => {
    mockListSubsByStripeSub.mockResolvedValue([{ subscription_id: 50, status: "active", duration_in_days: 365 }]);

    await processStripeInvoice(cycleInvoice());

    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockCreateSubscription).not.toHaveBeenCalled();
    expect(mockCreateShipment).not.toHaveBeenCalled();
    expect(mockExtendSubscription).toHaveBeenCalledWith(
      50,
      new Date((1_900_000_000 + 2 * 86_400) * 1000).toISOString()
    );
  });

  it("a cycle never shortens time already granted", async () => {
    const later = new Date((1_900_000_000 + 10 * 86_400) * 1000).toISOString();
    mockListSubsByStripeSub.mockResolvedValue([
      { subscription_id: 50, status: "active", duration_in_days: 30, expiration_datetime: later },
    ]);

    await processStripeInvoice(cycleInvoice());

    expect(mockExtendSubscription).toHaveBeenCalledWith(50, later);
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

    it("fails loudly when the paid-for plate cannot be assigned (taken or gone): no code is issued", async () => {
      mockAssignPlate.mockResolvedValue(false);

      await expect(processStripeInvoice(renewal("subscription_create"))).rejects.toThrow(/could not be assigned/);
      expect(mockIssueCode).not.toHaveBeenCalled();
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
      mockAssignPlate.mockResolvedValue(true);

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
