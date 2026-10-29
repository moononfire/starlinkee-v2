import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendMail } = vi.hoisted(() => ({
  mockSendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

import {
  sendOrderConfirmationToAdmin,
  sendCustomerRegistration,
  sendPlateSetupConfirmation,
  sendFeedbackNotification,
  sendGuestReplyNotification,
  sendPromoEmail,
  sendPlateImportLinks,
  sendReplyNotification,
} from "@/lib/email";

beforeEach(() => {
  vi.clearAllMocks();
  mockSendMail.mockResolvedValue({ messageId: "test-id" });
});

describe("sendOrderConfirmationToAdmin()", () => {
  it("sends to EMAIL_ADMIN with order id and customer name in subject", async () => {
    await sendOrderConfirmationToAdmin({
      orderId: 42,
      customerName: "Jan Kowalski",
      customerEmail: "jan@example.com",
      plateCount: 3,
    });

    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("admin@test.com");
    expect(call.subject).toContain("42");
    expect(call.subject).toContain("Jan Kowalski");
  });

  it("throws when Nodemailer returns an error", async () => {
    mockSendMail.mockRejectedValue(new Error("API limit reached"));

    await expect(
      sendOrderConfirmationToAdmin({
        orderId: 1,
        customerName: "Test",
        customerEmail: "test@test.com",
        plateCount: 1,
      })
    ).rejects.toThrow("SMTP Nodemailer error: API limit reached");
  });
});

describe("sendCustomerRegistration()", () => {
  it("sends to the provided address with order id in subject", async () => {
    await sendCustomerRegistration("customer@example.com", "en", {
      customerName: "Anna Nowak",
      orderId: 99,
    });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("customer@example.com");
    expect(call.subject).toContain("99");
  });

  it("uses Polish subject when language is pl", async () => {
    await sendCustomerRegistration("customer@example.com", "pl", {
      customerName: "Anna Nowak",
      orderId: 5,
    });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.subject).toContain("5");
  });
});

describe("sendPlateSetupConfirmation()", () => {
  it("sends to the provided address", async () => {
    await sendPlateSetupConfirmation("owner@restaurant.com", "en", {
      locationName: "My Bistro",
    });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("owner@restaurant.com");
  });
});

describe("sendGuestReplyNotification()", () => {
  const data = { locationName: "My Bistro", message: "<b>Still</b> waiting", subscriptionId: 50 };

  it("goes to the given address with the venue name and a link to the portal reviews", async () => {
    await sendGuestReplyNotification("owner@restaurant.com", "en", data);

    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("owner@restaurant.com");
    expect(call.subject).toBe("New reply from a guest — My Bistro");
    expect(call.text).toContain("<b>Still</b> waiting");
    expect(call.text).toContain("/portal/50/reviews");
  });

  it("is written in the owner's language (pl, de) and falls back to English", async () => {
    await sendGuestReplyNotification("o@x.com", "pl", data);
    await sendGuestReplyNotification("o@x.com", "de", data);
    await sendGuestReplyNotification("o@x.com", "it", data);

    expect(mockSendMail.mock.calls[0][0].subject).toBe("Nowa odpowiedź gościa — My Bistro");
    expect(mockSendMail.mock.calls[1][0].subject).toBe("Neue Antwort eines Gastes — My Bistro");
    expect(mockSendMail.mock.calls[2][0].subject).toBe("New reply from a guest — My Bistro");
  });

  it("escapes the guest's text in the HTML body", async () => {
    await sendGuestReplyNotification("o@x.com", "en", data);

    const html = mockSendMail.mock.calls[0][0].html as string;
    expect(html).toContain("&lt;b&gt;Still&lt;/b&gt; waiting");
    expect(html).not.toContain("<b>Still</b>");
  });
});

describe("sendFeedbackNotification()", () => {
  it("sends to the provided address with location name and rating in subject", async () => {
    await sendFeedbackNotification("owner@restaurant.com", "en", {
      locationName: "My Bistro",
      rating: 2,
      message: "Food was cold",
    });

    const call = mockSendMail.mock.calls[0][0];
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

    const call = mockSendMail.mock.calls[0][0];
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

    const call = mockSendMail.mock.calls[0][0];
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

    const call = mockSendMail.mock.calls[0][0];
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

    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("customer@example.com");
    expect(call.text).toContain("https://app.test/l/my-bistro/promo/claim/abc123");
  });
});

describe("sendPlateImportLinks()", () => {
  it("sends to ADMIN_EMAIL_FOR_PLATE_IMPORT with plate count in subject", async () => {
    await sendPlateImportLinks({ fileContent: "link1\nlink2", plateCount: 2 });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("import@test.com");
    expect(call.subject).toContain("2");
  });
});

describe("HTML escaping of user-controlled values", () => {
  const evil = '<a href="https://evil.example/login">Log in</a><script>x()</script>';

  it("renders feedback text, name and contact details as text, not markup", async () => {
    await sendFeedbackNotification("owner@x.pl", "en", {
      locationName: evil,
      rating: 5,
      message: evil,
      userName: evil,
      contactEmail: evil,
      contactPhone: evil,
    });
    const { html } = mockSendMail.mock.calls[0][0];
    expect(html).not.toContain("<a href=\"https://evil.example");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;a href=&quot;https://evil.example/login&quot;&gt;");
  });

  it("escapes reply text and refuses non-http button links", async () => {
    await sendReplyNotification("guest@x.pl", "en", {
      locationName: "Cafe",
      message: evil,
      scanUrl: "javascript:alert(1)",
    });
    const { html } = mockSendMail.mock.calls[0][0];
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("javascript:");
  });

  it("writes to an Italian guest in Italian, other languages as before", async () => {
    await sendReplyNotification("guest@x.it", "it", { locationName: "Bar", message: "Ciao", scanUrl: "https://app/x" });
    expect(mockSendMail.mock.calls[0][0].subject).toBe("Nuova risposta da Bar");
    expect(mockSendMail.mock.calls[0][0].html).toContain("Vedi la conversazione");

    await sendReplyNotification("guest@x.de", "de", { locationName: "Bar", message: "Hallo", scanUrl: "https://app/x" });
    expect(mockSendMail.mock.calls[1][0].subject).toBe("Neue Antwort von Bar");
  });

  it("escapes the promo text and plate import contents", async () => {
    await sendPromoEmail("guest@x.pl", { locationName: "Cafe", claimUrl: "https://app/x", smsText: evil });
    expect(mockSendMail.mock.calls[0][0].html).not.toContain("<script>");
    mockSendMail.mockClear();
    await sendPlateImportLinks({ fileContent: evil, plateCount: 1 });
    expect(mockSendMail.mock.calls[0][0].html).not.toContain("<script>");
  });
});
