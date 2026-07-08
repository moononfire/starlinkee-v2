export async function sendSms(phone: string, message: string): Promise<void> {
  const senderNumber = process.env.HTTPSMS_SENDER_NUMBER;
  const apiKey = process.env.HTTPSMS_API_KEY;

  if (!apiKey || !senderNumber) {
    throw new Error(
      `httpsms env vars missing: ${!apiKey ? "HTTPSMS_API_KEY " : ""}${!senderNumber ? "HTTPSMS_SENDER_NUMBER" : ""}`
    );
  }

  const res = await fetch("https://api.httpsms.com/v1/messages/send", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
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
