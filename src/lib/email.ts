import nodemailer from "nodemailer";

type Lang = "en" | "de" | "pl";

// ---------------------------------------------------------------------------
// HTML layout helpers
// ---------------------------------------------------------------------------

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
<tr><td style="background:#18181b;border-radius:8px 8px 0 0;padding:20px 32px;">
  <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">&#9733; Starlinkee</span>
</td></tr>
<tr><td style="background:#fff;padding:32px 32px 24px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
${content}
</td></tr>
<tr><td style="background:#fafafa;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px;padding:16px 32px;">
  <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">&copy; 2026 Starlinkee &nbsp;&middot;&nbsp; <a href="https://starlinkee.com" style="color:#71717a;text-decoration:none;">starlinkee.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Values that originate from users (feedback text, names, locations, links)
 * must be escaped before they are interpolated into the HTML templates.
 */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only http(s) targets may become a button link; anything else is dropped. */
function safeHref(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return esc(parsed.toString());
  } catch {
    // fall through
  }
  return "#";
}

const h1 = (t: string) =>
  `<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;line-height:1.3;">${t}</h1>`;

const para = (t: string) =>
  `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#3f3f46;">${t}</p>`;

const divider = () =>
  `<hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;">`;

const btn = (href: string, label: string) =>
  `<a href="${safeHref(href)}" style="display:inline-block;margin-top:8px;background:#18181b;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">${label}</a>`;

function dataTable(...rows: [label: string, value: string][]): string {
  const cells = rows
    .map(
      ([l, v]) =>
        `<tr>
          <td style="padding:8px 16px 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;color:#71717a;white-space:nowrap;vertical-align:top;">${l}</td>
          <td style="padding:8px 0;font-size:14px;font-weight:500;color:#18181b;">${v}</td>
        </tr>`
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e4e7;margin:20px 0 0;width:100%;">${cells}</table>`;
}

// ---------------------------------------------------------------------------
// Localized strings for customer-facing emails
// ---------------------------------------------------------------------------

const strings = {
  en: {
    orderSubject: (id: number) => `Order Confirmed — #${id}`,
    orderGreeting: (name: string) => `Hello ${name},`,
    orderBody: () =>
      "Thank you for your order! We'll process it shortly and ship your Starlinkee plate(s) to your address.",
    orderNumberLabel: "Order number",
    orderQuestions: "If you have any questions, simply reply to this email.",

    setupSubject: "Your Starlinkee plate is now active",
    setupGreeting: "Hello,",
    setupBody: (name: string) =>
      `Your Starlinkee plate for <strong>${name}</strong> has been successfully set up and is now active.`,
    setupBody2: "Guests can now scan your plate and leave reviews directly.",
    setupFooter: "Thank you for using Starlinkee.",

    renewalSubject: "Your Starlinkee subscription has been renewed",
    renewalGreeting: "Hello,",
    renewalBody: (plateNumber: string) =>
      `Your subscription for plate <strong>${plateNumber}</strong> has been successfully renewed. Thank you for your payment.`,
    renewalFooter: "Thank you for using Starlinkee.",
  },
  de: {
    orderSubject: (id: number) => `Bestellung bestätigt — #${id}`,
    orderGreeting: (name: string) => `Hallo ${name},`,
    orderBody: () =>
      "Vielen Dank für Ihre Bestellung! Wir werden sie in Kürze bearbeiten und Ihre Starlinkee-Aufsteller an Ihre Adresse versenden.",
    orderNumberLabel: "Bestellnummer",
    orderQuestions: "Bei Fragen antworten Sie einfach auf diese E-Mail.",

    setupSubject: "Ihr Starlinkee-Aufsteller ist jetzt aktiv",
    setupGreeting: "Hallo,",
    setupBody: (name: string) =>
      `Ihr Starlinkee-Aufsteller für <strong>${name}</strong> wurde erfolgreich eingerichtet und ist jetzt aktiv.`,
    setupBody2:
      "Gäste können jetzt Ihren Aufsteller scannen und direkt Bewertungen hinterlassen.",
    setupFooter: "Vielen Dank, dass Sie Starlinkee nutzen.",

    renewalSubject: "Ihr Starlinkee-Abonnement wurde verlängert",
    renewalGreeting: "Hallo,",
    renewalBody: (plateNumber: string) =>
      `Ihr Abonnement für Aufsteller <strong>${plateNumber}</strong> wurde erfolgreich verlängert. Vielen Dank für Ihre Zahlung.`,
    renewalFooter: "Vielen Dank, dass Sie Starlinkee nutzen.",
  },
  pl: {
    orderSubject: (id: number) => `Zamówienie potwierdzone — #${id}`,
    orderGreeting: (name: string) => `Cześć ${name},`,
    orderBody: () =>
      "Dziękujemy za zamówienie! Wkrótce je zrealizujemy i wyślemy Twoje tabliczki Starlinkee na podany adres.",
    orderNumberLabel: "Numer zamówienia",
    orderQuestions: "W razie pytań odpowiedz na tę wiadomość.",

    setupSubject: "Twoja tabliczka Starlinkee jest już aktywna",
    setupGreeting: "Cześć,",
    setupBody: (name: string) =>
      `Twoja tabliczka Starlinkee dla <strong>${name}</strong> została pomyślnie skonfigurowana i jest już aktywna.`,
    setupBody2: "Goście mogą teraz skanować Twoją tabliczkę i zostawiać opinie.",
    setupFooter: "Dziękujemy za korzystanie z Starlinkee.",

    renewalSubject: "Twoja subskrypcja Starlinkee została odnowiona",
    renewalGreeting: "Cześć,",
    renewalBody: (plateNumber: string) =>
      `Twoja subskrypcja dla tabliczki <strong>${plateNumber}</strong> została pomyślnie odnowiona. Dziękujemy za płatność.`,
    renewalFooter: "Dziękujemy za korzystanie z Starlinkee.",
  },
} satisfies Record<Lang, object>;

function toLang(l: string): Lang {
  if (l === "de" || l === "pl") return l;
  return "en";
}

// ---------------------------------------------------------------------------
// Internal send helper
// ---------------------------------------------------------------------------

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

async function sendMail(
  to: string,
  subject: string,
  html: string,
  text: string
) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || "noreply@starlinkee.com";
  
  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
  } catch (error: any) {
    throw new Error(`SMTP Nodemailer error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendOrderConfirmationToAdmin(data: {
  orderId: number;
  customerName: string;
  customerEmail: string;
  plateCount: number;
}) {
  const html = layout(
    h1("New Order Received") +
      para("A new order has been placed and payment was confirmed via Stripe.") +
      dataTable(
        ["Order ID", `#${data.orderId}`],
        ["Customer", esc(data.customerName)],
        ["Email", esc(data.customerEmail)],
        ["Plates", String(data.plateCount)]
      )
  );
  await sendMail(
    process.env.EMAIL_ADMIN!,
    `New order #${data.orderId} — ${data.customerName}`,
    html,
    `New order #${data.orderId}\nCustomer: ${data.customerName} (${data.customerEmail})\nPlates: ${data.plateCount}`
  );
}

export async function sendQuickPlateCredentialsToAdmin(data: {
  plateNumber: string;
  businessName: string;
  businessAddress?: string;
  googleReviewLink: string;
  customerEmail: string;
  portalPassword: string | null;
  existingAccount: boolean;
}) {
  const html = layout(
    h1("Quick plate activated") +
      para(
        `A plate was quickly activated for a prospective customer via Google Places lookup. It now redirects straight to their Google review page.`
      ) +
      dataTable(
        ["Plate number", esc(data.plateNumber)],
        ["Business", esc(data.businessName)],
        ...(data.businessAddress ? ([["Address", esc(data.businessAddress)]] as [string, string][]) : []),
        ["Google review link", esc(data.googleReviewLink)],
        ["Portal email", esc(data.customerEmail)],
        [
          "Portal password",
          data.existingAccount
            ? "(existing account — unchanged, use previous password or reset)"
            : esc(data.portalPassword ?? "—"),
        ]
      )
  );
  const text = [
    "Quick plate activated",
    `Plate number: ${data.plateNumber}`,
    `Business: ${data.businessName}`,
    data.businessAddress ? `Address: ${data.businessAddress}` : null,
    `Google review link: ${data.googleReviewLink}`,
    `Portal email: ${data.customerEmail}`,
    `Portal password: ${
      data.existingAccount ? "(existing account — unchanged)" : data.portalPassword ?? "—"
    }`,
  ]
    .filter(Boolean)
    .join("\n");
  await sendMail(
    process.env.EMAIL_ADMIN!,
    `Quick plate ${data.plateNumber} activated — ${data.businessName}`,
    html,
    text
  );
}

export async function sendCustomerRegistration(
  to: string,
  language: string,
  data: { customerName: string; orderId: number }
) {
  const s = strings[toLang(language)];
  const html = layout(
    h1(s.orderGreeting(esc(data.customerName))) +
      para(s.orderBody()) +
      dataTable([s.orderNumberLabel, `#${data.orderId}`]) +
      divider() +
      para(s.orderQuestions)
  );
  await sendMail(
    to,
    s.orderSubject(data.orderId),
    html,
    [
      s.orderGreeting(data.customerName),
      "",
      s.orderBody(),
      `${s.orderNumberLabel}: #${data.orderId}`,
      "",
      s.orderQuestions,
    ].join("\n")
  );
}

export async function sendPlateSetupConfirmation(
  to: string,
  language: string,
  data: { locationName: string }
) {
  const s = strings[toLang(language)];
  const html = layout(
    h1(s.setupGreeting) +
      para(s.setupBody(esc(data.locationName))) +
      para(s.setupBody2) +
      divider() +
      para(s.setupFooter)
  );
  await sendMail(
    to,
    s.setupSubject,
    html,
    [
      s.setupGreeting,
      "",
      s.setupBody(data.locationName).replace(/<[^>]+>/g, ""),
      s.setupBody2,
      "",
      s.setupFooter,
    ].join("\n")
  );
}

export async function sendRenewalConfirmation(
  to: string,
  language: string,
  data: { plateNumber: string }
) {
  const s = strings[toLang(language)];
  const html = layout(
    h1(s.renewalGreeting) +
      para(s.renewalBody(esc(data.plateNumber))) +
      divider() +
      para(s.renewalFooter)
  );
  await sendMail(
    to,
    s.renewalSubject,
    html,
    [
      s.renewalGreeting,
      "",
      s.renewalBody(data.plateNumber).replace(/<[^>]+>/g, ""),
      "",
      s.renewalFooter,
    ].join("\n")
  );
}

export async function sendRenewalConfirmationToAdmin(data: {
  plateNumber: string;
  customerEmail: string;
  interval: "month" | "year";
}) {
  const html = layout(
    h1("Subscription Renewed") +
      para("A plate subscription was renewed and payment was confirmed via Stripe.") +
      dataTable(
        ["Plate", esc(data.plateNumber)],
        ["Customer email", esc(data.customerEmail)],
        ["Interval", data.interval === "year" ? "1 year" : "1 month"]
      )
  );
  await sendMail(
    process.env.EMAIL_ADMIN!,
    `Subscription renewed — ${data.plateNumber}`,
    html,
    `Plate ${data.plateNumber} renewed (${data.interval})\nCustomer: ${data.customerEmail}`
  );
}

export async function sendDuplicateStripeSubscriptionToAdmin(data: {
  subscriptionId: number;
  plateNumber: string;
  customerEmail: string;
  previousStripeSubscriptionId: string;
  newStripeSubscriptionId: string;
}) {
  const html = layout(
    h1("Possible double Stripe subscription") +
      para(
        "A renewal was paid for a subscription that already has another live Stripe subscription. " +
          "The customer may be charged twice. Nothing was cancelled automatically: check both in Stripe and cancel one."
      ) +
      dataTable(
        ["Subscription", String(data.subscriptionId)],
        ["Plate", esc(data.plateNumber)],
        ["Customer email", esc(data.customerEmail)],
        ["Previous Stripe subscription", esc(data.previousStripeSubscriptionId)],
        ["New Stripe subscription", esc(data.newStripeSubscriptionId)]
      )
  );
  await sendMail(
    process.env.EMAIL_ADMIN!,
    `Possible double subscription — ${data.plateNumber}`,
    html,
    `Subscription ${data.subscriptionId} (plate ${data.plateNumber}, ${data.customerEmail}) has two live Stripe subscriptions: ` +
      `${data.previousStripeSubscriptionId} and ${data.newStripeSubscriptionId}. Cancel one in Stripe.`
  );
}

const feedbackStrings = {
  en: {
    title: (locationName: string) => `New feedback — ${locationName}`,
    subject: (locationName: string, rating: number) =>
      `New feedback for ${locationName} — ${rating}/5`,
    textTitle: (locationName: string) => `New feedback for ${locationName}`,
    ratingText: (rating: number) => `Rating: ${rating}/5`,
    messageText: (message: string) => `Message:\n${message}`,
    nameLabel: "Name",
    emailLabel: "Email",
    phoneLabel: "Phone",
    replyBtn: "Reply to review",
  },
  de: {
    title: (locationName: string) => `Neues Feedback — ${locationName}`,
    subject: (locationName: string, rating: number) =>
      `Neues Feedback für ${locationName} — ${rating}/5`,
    textTitle: (locationName: string) => `Neues Feedback für ${locationName}`,
    ratingText: (rating: number) => `Bewertung: ${rating}/5`,
    messageText: (message: string) => `Nachricht:\n${message}`,
    nameLabel: "Name",
    emailLabel: "E-Mail",
    phoneLabel: "Telefon",
    replyBtn: "Auf Feedback antworten",
  },
  pl: {
    title: (locationName: string) => `Nowa opinia — ${locationName}`,
    subject: (locationName: string, rating: number) =>
      `Nowa opinia dla ${locationName} — ${rating}/5`,
    textTitle: (locationName: string) => `Nowa opinia dla ${locationName}`,
    ratingText: (rating: number) => `Ocena: ${rating}/5`,
    messageText: (message: string) => `Wiadomość:\n${message}`,
    nameLabel: "Imię",
    emailLabel: "E-mail",
    phoneLabel: "Telefon",
    replyBtn: "Odpowiedz na opinię",
  },
} satisfies Record<Lang, object>;

const guestReplyStrings = {
  en: {
    title: (locationName: string) => `New reply from a guest — ${locationName}`,
    subject: (locationName: string) => `New reply from a guest — ${locationName}`,
    intro: "A guest answered in the conversation about their feedback:",
    btn: "Open the conversation",
  },
  de: {
    title: (locationName: string) => `Neue Antwort eines Gastes — ${locationName}`,
    subject: (locationName: string) => `Neue Antwort eines Gastes — ${locationName}`,
    intro: "Ein Gast hat in der Unterhaltung zu seinem Feedback geantwortet:",
    btn: "Unterhaltung öffnen",
  },
  pl: {
    title: (locationName: string) => `Nowa odpowiedź gościa — ${locationName}`,
    subject: (locationName: string) => `Nowa odpowiedź gościa — ${locationName}`,
    intro: "Gość odpisał w rozmowie o swojej opinii:",
    btn: "Otwórz rozmowę",
  },
} satisfies Record<Lang, object>;

/** Tells the venue owner that a guest replied in an existing feedback thread. */
export async function sendGuestReplyNotification(
  to: string,
  language: string,
  data: { locationName: string; message: string; subscriptionId: number }
) {
  const s = guestReplyStrings[toLang(language)];
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.starlinkee.com").replace(/\/$/, "");
  const link = `${appUrl}/portal/${data.subscriptionId}/reviews`;

  const html = layout(
    h1(s.title(esc(data.locationName))) +
      para(s.intro) +
      `<blockquote style="margin:0;padding:12px 16px;background:#f4f4f5;border-left:3px solid #d4d4d8;border-radius:0 4px 4px 0;font-size:14px;line-height:1.7;color:#3f3f46;white-space:pre-wrap;">${esc(data.message)}</blockquote>` +
      `<div style="margin-top:24px;">${btn(link, s.btn)}</div>`
  );
  const text = [s.title(data.locationName), s.intro, "", data.message, "", `${s.btn}: ${link}`].join("\n");

  await sendMail(to, s.subject(data.locationName), html, text);
}

export async function sendFeedbackNotification(
  to: string,
  language: string,
  data: {
    locationName: string;
    rating: number;
    message: string;
    userName?: string;
    contactEmail?: string;
    contactPhone?: string;
    subscriptionId?: number;
  }
) {
  const s = feedbackStrings[toLang(language)];
  const stars =
    "&#9733;".repeat(data.rating) + "&#9734;".repeat(5 - data.rating);
  const contactRows: [string, string][] = [
    ...(data.userName ? ([[s.nameLabel, esc(data.userName)]] as [string, string][]) : []),
    ...(data.contactEmail
      ? ([[s.emailLabel, esc(data.contactEmail)]] as [string, string][])
      : []),
    ...(data.contactPhone
      ? ([[s.phoneLabel, esc(data.contactPhone)]] as [string, string][])
      : []),
  ];

  let appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.starlinkee.com";
  appUrl = appUrl.replace(/\/$/, "");

  const btnHtml = data.subscriptionId
    ? `<div style="margin-top:24px;">${btn(`${appUrl}/portal/${data.subscriptionId}/reviews`, s.replyBtn)}</div>`
    : "";

  const html = layout(
    h1(s.title(esc(data.locationName))) +
      para(
        `<span style="font-size:18px;letter-spacing:2px;color:#f59e0b;">${stars}</span>&nbsp; ${data.rating}/5`
      ) +
      (contactRows.length ? dataTable(...contactRows) : "") +
      divider() +
      `<blockquote style="margin:0;padding:12px 16px;background:#f4f4f5;border-left:3px solid #d4d4d8;border-radius:0 4px 4px 0;font-size:14px;line-height:1.7;color:#3f3f46;white-space:pre-wrap;">${esc(data.message)}</blockquote>` +
      btnHtml
  );

  const textLines = [
    s.textTitle(data.locationName),
    s.ratingText(data.rating),
    ...(data.userName ? [`${s.nameLabel}: ${data.userName}`] : []),
    ...(data.contactEmail ? [`${s.emailLabel}: ${data.contactEmail}`] : []),
    ...(data.contactPhone ? [`${s.phoneLabel}: ${data.contactPhone}`] : []),
    "",
    s.messageText(data.message),
    ...(data.subscriptionId ? ["", `${s.replyBtn}: ${appUrl}/portal/${data.subscriptionId}/reviews`] : []),
  ];

  await sendMail(to, s.subject(data.locationName, data.rating), html, textLines.join("\n"));
}

const replyStrings = {
  en: {
    subject: (locationName: string) => `New reply from ${locationName}`,
    title: (locationName: string) => `${locationName} replied to your feedback`,
    viewConversationBtn: "View conversation",
  },
  de: {
    subject: (locationName: string) => `Neue Antwort von ${locationName}`,
    title: (locationName: string) => `${locationName} hat auf Ihr Feedback geantwortet`,
    viewConversationBtn: "Unterhaltung ansehen",
  },
  pl: {
    subject: (locationName: string) => `Nowa odpowiedź od ${locationName}`,
    title: (locationName: string) => `${locationName} odpowiedział na Twoją opinię`,
    viewConversationBtn: "Zobacz rozmowę",
  },
  // The only email a guest receives, so it is the only one with Italian.
  it: {
    subject: (locationName: string) => `Nuova risposta da ${locationName}`,
    title: (locationName: string) => `${locationName} ha risposto al tuo feedback`,
    viewConversationBtn: "Vedi la conversazione",
  },
} satisfies Record<Lang | "it", object>;

export async function sendReplyNotification(
  to: string,
  language: string,
  data: { locationName: string; message: string; scanUrl: string }
) {
  const s = replyStrings[language === "it" ? "it" : toLang(language)];

  const html = layout(
    h1(s.title(esc(data.locationName))) +
      `<blockquote style="margin:0;padding:12px 16px;background:#f4f4f5;border-left:3px solid #d4d4d8;border-radius:0 4px 4px 0;font-size:14px;line-height:1.7;color:#3f3f46;white-space:pre-wrap;">${esc(data.message)}</blockquote>` +
      `<div style="margin-top:20px;">${btn(data.scanUrl, s.viewConversationBtn)}</div>`
  );

  const text = `${s.title(data.locationName)}\n\n${data.message}\n\n${data.scanUrl}`;

  await sendMail(to, s.subject(data.locationName), html, text);
}

export async function sendPromoEmail(
  to: string,
  data: { locationName: string; claimUrl: string; smsText: string }
) {
  const html = layout(
    h1(`Your promo from ${esc(data.locationName)}`) +
      para(esc(data.smsText)) +
      para("Click the button below to claim your promotion:") +
      btn(data.claimUrl, "Claim Promo")
  );
  await sendMail(
    to,
    `Your promo from ${data.locationName}`,
    html,
    `${data.smsText}\n\nClaim your promo here: ${data.claimUrl}`
  );
}

const portalCredentialsStrings = {
  en: {
    subject: "Your Starlinkee account is ready",
    greeting: (name: string) => `Hello ${name},`,
    bodyNew: () =>
      "Your Starlinkee purchase is complete! We've created your customer portal account. Use the credentials below to log in — we recommend changing your password after your first login.",
    bodyExisting: () =>
      "Your Starlinkee purchase is complete! You already have a customer portal account, so you can log in with your existing email and password.",
    emailLabel: "Email",
    passwordLabel: "Password",
    btnLabel: "Log in to portal",
    footer: "If you did not make this purchase, please contact us.",
  },
  de: {
    subject: "Ihr Starlinkee-Konto ist bereit",
    greeting: (name: string) => `Hallo ${name},`,
    bodyNew: () =>
      "Ihr Starlinkee-Kauf ist abgeschlossen! Wir haben Ihr Kundenportal-Konto erstellt. Nutzen Sie die untenstehenden Zugangsdaten zum Einloggen — wir empfehlen, Ihr Passwort nach dem ersten Login zu ändern.",
    bodyExisting: () =>
      "Ihr Starlinkee-Kauf ist abgeschlossen! Sie haben bereits ein Kundenportal-Konto und können sich mit Ihrer bestehenden E-Mail-Adresse und Ihrem Passwort anmelden.",
    emailLabel: "E-Mail",
    passwordLabel: "Passwort",
    btnLabel: "Zum Portal-Login",
    footer: "Wenn Sie diesen Kauf nicht getätigt haben, kontaktieren Sie uns bitte.",
  },
  pl: {
    subject: "Twoje konto Starlinkee jest gotowe",
    greeting: (name: string) => `Cześć ${name},`,
    bodyNew: () =>
      "Twój zakup Starlinkee został zrealizowany! Utworzyliśmy dla Ciebie konto w panelu klienta. Użyj poniższych danych, aby się zalogować — zalecamy zmianę hasła po pierwszym logowaniu.",
    bodyExisting: () =>
      "Twój zakup Starlinkee został zrealizowany! Masz już konto w panelu klienta, więc możesz zalogować się dotychczasowym adresem email i hasłem.",
    emailLabel: "Email",
    passwordLabel: "Hasło",
    btnLabel: "Zaloguj się do panelu",
    footer: "Jeśli nie dokonywałeś tego zakupu, skontaktuj się z nami.",
  },
} satisfies Record<Lang, object>;

export async function sendPortalCredentials(
  to: string,
  language: string,
  data: { customerName: string; loginUrl: string; password: string | null }
) {
  const s = portalCredentialsStrings[toLang(language)];
  const isNew = data.password !== null;
  const html = layout(
    h1(s.greeting(esc(data.customerName))) +
      para(isNew ? s.bodyNew() : s.bodyExisting()) +
      (isNew
        ? dataTable([s.emailLabel, esc(to)], [s.passwordLabel, esc(data.password!)])
        : "") +
      `<div style="margin-top:20px;">${btn(data.loginUrl, s.btnLabel)}</div>` +
      divider() +
      para(s.footer)
  );
  await sendMail(
    to,
    s.subject,
    html,
    [
      s.greeting(data.customerName),
      "",
      isNew ? s.bodyNew() : s.bodyExisting(),
      ...(isNew ? ["", `${s.emailLabel}: ${to}`, `${s.passwordLabel}: ${data.password}`] : []),
      "",
      `${s.btnLabel}: ${data.loginUrl}`,
      "",
      s.footer,
    ].join("\n")
  );
}

export async function sendPlateImportLinks(data: {
  fileContent: string;
  plateCount: number;
}) {
  const html = layout(
    h1("Plate import complete") +
      para(`${data.plateCount} plates were successfully imported.`) +
      divider() +
      `<pre style="font-family:'Courier New',monospace;font-size:12px;background:#f4f4f5;padding:16px;border-radius:6px;overflow-x:auto;white-space:pre-wrap;color:#18181b;">${esc(data.fileContent)}</pre>`
  );
  await sendMail(
    process.env.ADMIN_EMAIL_FOR_PLATE_IMPORT!,
    `Plate import — ${data.plateCount} plates`,
    html,
    `Plate import — ${data.plateCount} plates\n\n${data.fileContent}`
  );
}

const activationStrings = {
  en: {
    subject: "Your Starlinkee activation code",
    title: "Activate your Starlinkee plate",
    body: "Your Starlinkee plate has been assigned to your account. To set it up, scan the plate and enter this activation code when asked:",
    plates: "Plate(s)",
    codeLabel: "Activation code",
    footer: "Keep this code private. If you did not order a Starlinkee plate, please ignore this email.",
  },
  de: {
    subject: "Ihr Starlinkee-Aktivierungscode",
    title: "Starlinkee-Aufsteller aktivieren",
    body: "Ihr Starlinkee-Aufsteller wurde Ihrem Konto zugeordnet. Scannen Sie zur Einrichtung den Aufsteller und geben Sie bei Aufforderung diesen Aktivierungscode ein:",
    plates: "Aufsteller",
    codeLabel: "Aktivierungscode",
    footer: "Halten Sie diesen Code geheim. Wenn Sie keinen Starlinkee-Aufsteller bestellt haben, ignorieren Sie diese E-Mail.",
  },
  pl: {
    subject: "Twój kod aktywacyjny Starlinkee",
    title: "Aktywuj swoją tabliczkę Starlinkee",
    body: "Twoja tabliczka Starlinkee została przypisana do Twojego konta. Aby ją skonfigurować, zeskanuj tabliczkę i wpisz ten kod aktywacyjny, gdy zostaniesz o to poproszony:",
    plates: "Tabliczki",
    codeLabel: "Kod aktywacyjny",
    footer: "Nie udostępniaj tego kodu. Jeśli nie zamawiałeś tabliczki Starlinkee, zignoruj tę wiadomość.",
  },
} satisfies Record<Lang, object>;

export async function sendPlateActivationCode(
  to: string,
  language: string,
  data: { plateNumbers: string[]; code: string }
) {
  const s = activationStrings[toLang(language)];
  const plates = data.plateNumbers.join(", ");
  const html = layout(
    h1(s.title) +
      para(s.body) +
      dataTable([s.plates, esc(plates)], [s.codeLabel, `<strong style="font-size:20px;letter-spacing:2px;">${esc(data.code)}</strong>`]) +
      divider() +
      para(s.footer)
  );
  await sendMail(
    to,
    s.subject,
    html,
    [s.title, "", s.body, "", `${s.plates}: ${plates}`, `${s.codeLabel}: ${data.code}`, "", s.footer].join("\n")
  );
}

const accountLinkStrings = {
  en: {
    confirmSubject: "Confirm your Starlinkee account",
    confirmTitle: "Confirm your email address",
    confirmBody: "Thank you for signing up. Click the button below to confirm your email address and open your customer portal.",
    confirmBtn: "Confirm email",
    passwordSubject: "Set your Starlinkee password",
    passwordTitle: "Set your password",
    passwordBody: "Click the button below to choose a password and open your Starlinkee customer portal.",
    passwordBtn: "Set password",
    footer: "If you did not request this, you can safely ignore this email.",
  },
  de: {
    confirmSubject: "Bestätigen Sie Ihr Starlinkee-Konto",
    confirmTitle: "E-Mail-Adresse bestätigen",
    confirmBody: "Vielen Dank für Ihre Registrierung. Klicken Sie auf die Schaltfläche, um Ihre E-Mail-Adresse zu bestätigen und Ihr Kundenportal zu öffnen.",
    confirmBtn: "E-Mail bestätigen",
    passwordSubject: "Legen Sie Ihr Starlinkee-Passwort fest",
    passwordTitle: "Passwort festlegen",
    passwordBody: "Klicken Sie auf die Schaltfläche, um ein Passwort zu wählen und Ihr Starlinkee-Kundenportal zu öffnen.",
    passwordBtn: "Passwort festlegen",
    footer: "Wenn Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren.",
  },
  pl: {
    confirmSubject: "Potwierdź swoje konto Starlinkee",
    confirmTitle: "Potwierdź adres e-mail",
    confirmBody: "Dziękujemy za rejestrację. Kliknij przycisk poniżej, aby potwierdzić adres e-mail i otworzyć panel klienta.",
    confirmBtn: "Potwierdź e-mail",
    passwordSubject: "Ustaw hasło do konta Starlinkee",
    passwordTitle: "Ustaw hasło",
    passwordBody: "Kliknij przycisk poniżej, aby wybrać hasło i otworzyć panel klienta Starlinkee.",
    passwordBtn: "Ustaw hasło",
    footer: "Jeśli to nie Ty, zignoruj tę wiadomość.",
  },
} satisfies Record<Lang, object>;

/** Link emails for the signup flow: confirm a new account, or set a password for an existing customer. */
export async function sendAccountLink(
  to: string,
  language: string,
  data: { kind: "confirm" | "set-password"; link: string }
) {
  const s = accountLinkStrings[toLang(language)];
  const confirm = data.kind === "confirm";
  const title = confirm ? s.confirmTitle : s.passwordTitle;
  const body = confirm ? s.confirmBody : s.passwordBody;
  const label = confirm ? s.confirmBtn : s.passwordBtn;
  const html = layout(
    h1(title) + para(body) + `<div style="margin-top:20px;">${btn(data.link, label)}</div>` + divider() + para(s.footer)
  );
  await sendMail(
    to,
    confirm ? s.confirmSubject : s.passwordSubject,
    html,
    [title, "", body, "", `${label}: ${data.link}`, "", s.footer].join("\n")
  );
}
