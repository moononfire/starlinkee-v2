import { Resend } from "resend";

type Lang = "en" | "de" | "pl";

function resend() {
  return new Resend(process.env.RESEND_API_KEY);
}

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

const h1 = (t: string) =>
  `<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;line-height:1.3;">${t}</h1>`;

const para = (t: string) =>
  `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#3f3f46;">${t}</p>`;

const divider = () =>
  `<hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;">`;

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;margin-top:8px;background:#18181b;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">${label}</a>`;

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
  },
  de: {
    orderSubject: (id: number) => `Bestellung bestätigt — #${id}`,
    orderGreeting: (name: string) => `Hallo ${name},`,
    orderBody: () =>
      "Vielen Dank für Ihre Bestellung! Wir werden sie in Kürze bearbeiten und Ihre Starlinkee-Platte(n) an Ihre Adresse versenden.",
    orderNumberLabel: "Bestellnummer",
    orderQuestions: "Bei Fragen antworten Sie einfach auf diese E-Mail.",

    setupSubject: "Ihre Starlinkee-Platte ist jetzt aktiv",
    setupGreeting: "Hallo,",
    setupBody: (name: string) =>
      `Ihre Starlinkee-Platte für <strong>${name}</strong> wurde erfolgreich eingerichtet und ist jetzt aktiv.`,
    setupBody2:
      "Gäste können jetzt Ihre Platte scannen und direkt Bewertungen hinterlassen.",
    setupFooter: "Vielen Dank, dass Sie Starlinkee nutzen.",
  },
  pl: {
    orderSubject: (id: number) => `Zamówienie potwierdzone — #${id}`,
    orderGreeting: (name: string) => `Cześć ${name},`,
    orderBody: () =>
      "Dziękujemy za zamówienie! Wkrótce je zrealizujemy i wyślemy Twoje płytki Starlinkee na podany adres.",
    orderNumberLabel: "Numer zamówienia",
    orderQuestions: "W razie pytań odpowiedz na tę wiadomość.",

    setupSubject: "Twoja płytka Starlinkee jest już aktywna",
    setupGreeting: "Cześć,",
    setupBody: (name: string) =>
      `Twoja płytka Starlinkee dla <strong>${name}</strong> została pomyślnie skonfigurowana i jest już aktywna.`,
    setupBody2: "Goście mogą teraz skanować Twoją płytkę i zostawiać opinie.",
    setupFooter: "Dziękujemy za korzystanie z Starlinkee.",
  },
} satisfies Record<Lang, object>;

function toLang(l: string): Lang {
  if (l === "de" || l === "pl") return l;
  return "en";
}

// ---------------------------------------------------------------------------
// Internal send helper
// ---------------------------------------------------------------------------

async function sendMail(
  to: string,
  subject: string,
  html: string,
  text: string
) {
  const { error } = await resend().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
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
        ["Customer", data.customerName],
        ["Email", data.customerEmail],
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

export async function sendCustomerRegistration(
  to: string,
  language: string,
  data: { customerName: string; orderId: number }
) {
  const s = strings[toLang(language)];
  const html = layout(
    h1(s.orderGreeting(data.customerName)) +
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
      para(s.setupBody(data.locationName)) +
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

export async function sendFeedbackNotification(
  to: string,
  data: {
    locationName: string;
    rating: number;
    message: string;
    userName?: string;
    contactEmail?: string;
    contactPhone?: string;
  }
) {
  const stars =
    "&#9733;".repeat(data.rating) + "&#9734;".repeat(5 - data.rating);
  const contactRows: [string, string][] = [
    ...(data.userName ? ([["Name", data.userName]] as [string, string][]) : []),
    ...(data.contactEmail
      ? ([["Email", data.contactEmail]] as [string, string][])
      : []),
    ...(data.contactPhone
      ? ([["Phone", data.contactPhone]] as [string, string][])
      : []),
  ];

  const html = layout(
    h1(`New feedback — ${data.locationName}`) +
      para(
        `<span style="font-size:18px;letter-spacing:2px;color:#f59e0b;">${stars}</span>&nbsp; ${data.rating}/5`
      ) +
      (contactRows.length ? dataTable(...contactRows) : "") +
      divider() +
      `<blockquote style="margin:0;padding:12px 16px;background:#f4f4f5;border-left:3px solid #d4d4d8;border-radius:0 4px 4px 0;font-size:14px;line-height:1.7;color:#3f3f46;">${data.message}</blockquote>`
  );

  const textLines = [
    `New feedback for ${data.locationName}`,
    `Rating: ${data.rating}/5`,
    ...(data.userName ? [`Name: ${data.userName}`] : []),
    ...(data.contactEmail ? [`Email: ${data.contactEmail}`] : []),
    ...(data.contactPhone ? [`Phone: ${data.contactPhone}`] : []),
    "",
    `Message:\n${data.message}`,
  ];

  await sendMail(
    to,
    `New feedback for ${data.locationName} — ${data.rating}/5`,
    html,
    textLines.join("\n")
  );
}

export async function sendPromoEmail(
  to: string,
  data: { locationName: string; claimUrl: string; smsText: string }
) {
  const html = layout(
    h1(`Your promo from ${data.locationName}`) +
      para(data.smsText) +
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

const activationStrings = {
  en: {
    subject: "Activate your Starlinkee account",
    greeting: (name: string) => `Hello ${name},`,
    body: () =>
      "Your Starlinkee purchase is complete! Click the button below to set up your account password and access your customer portal.",
    btnLabel: "Activate Account",
    footer: "If you did not make this purchase, you can ignore this email.",
  },
  de: {
    subject: "Aktivieren Sie Ihr Starlinkee-Konto",
    greeting: (name: string) => `Hallo ${name},`,
    body: () =>
      "Ihr Starlinkee-Kauf ist abgeschlossen! Klicken Sie auf die Schaltfläche unten, um Ihr Kontopasswort festzulegen und auf Ihr Kundenportal zuzugreifen.",
    btnLabel: "Konto aktivieren",
    footer:
      "Wenn Sie diesen Kauf nicht getätigt haben, können Sie diese E-Mail ignorieren.",
  },
  pl: {
    subject: "Aktywuj swoje konto Starlinkee",
    greeting: (name: string) => `Cześć ${name},`,
    body: () =>
      "Twój zakup Starlinkee został zrealizowany! Kliknij poniższy przycisk, aby ustawić hasło i uzyskać dostęp do panelu klienta.",
    btnLabel: "Aktywuj konto",
    footer:
      "Jeśli nie dokonywałeś tego zakupu, możesz zignorować tę wiadomość.",
  },
} satisfies Record<Lang, object>;

export async function sendPortalActivation(
  to: string,
  language: string,
  data: { customerName: string; activationUrl: string }
) {
  const s = activationStrings[toLang(language)];
  const html = layout(
    h1(s.greeting(data.customerName)) +
      para(s.body()) +
      btn(data.activationUrl, s.btnLabel) +
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
      s.body(),
      `${s.btnLabel}: ${data.activationUrl}`,
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
      `<pre style="font-family:'Courier New',monospace;font-size:12px;background:#f4f4f5;padding:16px;border-radius:6px;overflow-x:auto;white-space:pre-wrap;color:#18181b;">${data.fileContent}</pre>`
  );
  await sendMail(
    process.env.ADMIN_EMAIL_FOR_PLATE_IMPORT!,
    `Plate import — ${data.plateCount} plates`,
    html,
    `Plate import — ${data.plateCount} plates\n\n${data.fileContent}`
  );
}
