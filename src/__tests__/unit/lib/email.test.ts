import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockEmailsSend } = vi.hoisted(() => ({
  mockEmailsSend: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn(function (this: { emails: { send: typeof mockEmailsSend } }) {
    this.emails = { send: mockEmailsSend };
  }),
}));

import {
  sendOrderConfirmationToAdmin,
  sendCustomerRegistration,
  sendPlateSetupConfirmation,
  sendFeedbackNotification,
  sendPromoEmail,
  sendPlateImportLinks,
} from "@/lib/email";

beforeEach(() => {
  vi.clearAllMocks();
  mockEmailsSend.mockResolvedValue({ error: null });
});

describe("sendOrderConfirmationToAdmin()", () => {
  it("sends to EMAIL_ADMIN with order id and customer name in subject", async () => {
    await sendOrderConfirmationToAdmin({
      orderId: 42,
      customerName: "Jan Kowalski",
      customerEmail: "jan@example.com",
      plateCount: 3,
    });

    expect(mockEmailsSend).toHaveBeenCalledOnce();
    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.to).toBe("admin@test.com");
    expect(call.subject).toContain("42");
    expect(call.subject).toContain("Jan Kowalski");
  });

  it("throws when Resend returns an error", async () => {
    mockEmailsSend.mockResolvedValue({ error: { message: "API limit reached" } });

    await expect(
      sendOrderConfirmationToAdmin({
        orderId: 1,
        customerName: "Test",
        customerEmail: "test@test.com",
        plateCount: 1,
      })
    ).rejects.toThrow("Resend error");
  });
});

describe("sendCustomerRegistration()", () => {
  it("sends to the provided address with order id in subject", async () => {
    await sendCustomerRegistration("customer@example.com", "en", {
      customerName: "Anna Nowak",
      orderId: 99,
    });

    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.to).toBe("customer@example.com");
    expect(call.subject).toContain("99");
  });

  it("uses Polish subject when language is pl", async () => {
    await sendCustomerRegistration("customer@example.com", "pl", {
      customerName: "Anna Nowak",
      orderId: 5,
    });

    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.subject).toContain("5");
  });
});

describe("sendPlateSetupConfirmation()", () => {
  it("sends to the provided address", async () => {
    await sendPlateSetupConfirmation("owner@restaurant.com", "en", {
      locationName: "My Bistro",
    });

    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.to).toBe("owner@restaurant.com");
  });
});

describe("sendFeedbackNotification()", () => {
  it("sends to the provided address with location name and rating in subject", async () => {
    await sendFeedbackNotification("owner@restaurant.com", "en", {
      locationName: "My Bistro",
      rating: 2,
      message: "Food was cold",
    });

    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.to).toBe("owner@restaurant.com");
    expect(call.subject).toContain("My Bistro");
    expect(call.subject).toContain("2");
  });

  it("includes optional contact fields in text body when provided", async () => {
    await sendFeedbackNotification("owner@restaurant.com", "en", {
      locationName: "My Bistro",
      rating: 1,
      message: "Bad experience",
      userName: "Jan",
      contactEmail: "jan@example.com",
      contactPhone: "+48600000000",
    });

    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.text).toContain("Jan");
    expect(call.text).toContain("jan@example.com");
    expect(call.text).toContain("+48600000000");
  });

  it("omits optional fields when not provided", async () => {
    await sendFeedbackNotification("owner@restaurant.com", "en", {
      locationName: "My Bistro",
      rating: 3,
      message: "OK",
    });

    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.text).not.toContain("undefined");
    expect(call.text).not.toContain("null");
  });

  it("localizes subject and labels according to the given language", async () => {
    await sendFeedbackNotification("owner@restaurant.com", "pl", {
      locationName: "My Bistro",
      rating: 4,
      message: "Dobrze",
      userName: "Anna",
    });

    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.subject).toContain("Nowa opinia");
    expect(call.text).toContain("Imię: Anna");
    expect(call.text).toContain("Ocena: 4/5");
  });
});

describe("sendPromoEmail()", () => {
  it("sends to the provided address with claim url in text body", async () => {
    await sendPromoEmail("customer@example.com", {
      locationName: "My Bistro",
      claimUrl: "https://app.test/l/my-bistro/promo/claim/abc123",
      smsText: "Odbierz swój kupon!",
    });

    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.to).toBe("customer@example.com");
    expect(call.text).toContain("https://app.test/l/my-bistro/promo/claim/abc123");
  });
});

describe("sendPlateImportLinks()", () => {
  it("sends to ADMIN_EMAIL_FOR_PLATE_IMPORT with plate count in subject", async () => {
    await sendPlateImportLinks({ fileContent: "link1\nlink2", plateCount: 2 });

    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.to).toBe("import@test.com");
    expect(call.subject).toContain("2");
  });
});
