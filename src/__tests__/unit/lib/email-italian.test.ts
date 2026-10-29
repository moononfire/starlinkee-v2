import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));

import {
  sendCustomerRegistration,
  sendPortalCredentials,
  sendPlateActivationCode,
  sendAccountLink,
  sendFeedbackNotification,
  sendGuestReplyNotification,
  sendReplyNotification,
} from "@/lib/email";

beforeEach(() => {
  sendMail.mockReset().mockResolvedValue({});
  process.env.SMTP_HOST = "localhost";
  process.env.EMAIL_FROM = "noreply@example.com";
});

const subjectOf = () => sendMail.mock.calls[0][0].subject as string;

describe("e-mails in Italian", () => {
  it("customer registration", async () => {
    await sendCustomerRegistration("a@b.com", "it", { customerName: "Anna", orderId: 5 });
    expect(subjectOf()).toBe("Ordine confermato — #5");
  });
  it("portal credentials", async () => {
    await sendPortalCredentials("a@b.com", "it", { customerName: "Anna", loginUrl: "http://x", password: null });
    expect(subjectOf()).toBe("Il tuo account Starlinkee è pronto");
  });
  it("activation code", async () => {
    await sendPlateActivationCode("a@b.com", "it", { plateNumbers: ["AB1"], code: "123" });
    expect(subjectOf()).toBe("Il tuo codice di attivazione Starlinkee");
  });
  it("account link", async () => {
    await sendAccountLink("a@b.com", "it", { kind: "confirm", link: "http://x" });
    expect(subjectOf()).toBe("Conferma il tuo account Starlinkee");
  });
  it("feedback notification to the venue owner", async () => {
    await sendFeedbackNotification("a@b.com", "it", { locationName: "Bar", rating: 2, message: "x", subscriptionId: 1 });
    expect(subjectOf()).toBe("Nuovo feedback per Bar — 2/5");
  });
  it("guest reply notification to the venue owner", async () => {
    await sendGuestReplyNotification("a@b.com", "it", { locationName: "Bar", message: "x", subscriptionId: 1 });
    expect(subjectOf()).toBe("Nuova risposta di un ospite — Bar");
  });
  it("owner reply to the guest still works", async () => {
    await sendReplyNotification("a@b.com", "it", { locationName: "Bar", message: "x", scanUrl: "http://x" });
    expect(subjectOf()).toBe("Nuova risposta da Bar");
  });
  it("an unknown language still falls back to English", async () => {
    await sendCustomerRegistration("a@b.com", "xx", { customerName: "Anna", orderId: 5 });
    expect(subjectOf()).toBe("Order Confirmed — #5");
  });
});
