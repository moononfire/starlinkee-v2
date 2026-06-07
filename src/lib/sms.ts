export async function sendSms(phone: string, message: string): Promise<void> {
  const senderNumber = phone.startsWith("+48")
    ? process.env.HTTPSMS_SENDER_NUMBER_PL!
    : process.env.HTTPSMS_SENDER_NUMBER!;

  const res = await fetch("https://api.httpsms.com/v1/messages/send", {
    method: "POST",
    headers: {
      "x-api-key": process.env.HTTPSMS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: message,
      from: senderNumber,
      to: phone,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`httpsms error ${res.status}: ${body}`);
  }
}
