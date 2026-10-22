import { createHash, randomInt, timingSafeEqual } from "crypto";

// No 0/O/1/I/L to keep codes easy to read from an email or print-out.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateActivationCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

function normalize(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashActivationCode(code: string): string {
  return createHash("sha256").update(normalize(code)).digest("hex");
}

/** "ABCD-EFGH" for display. */
export function formatActivationCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function verifyActivationCode(submitted: unknown, storedHash: string | null | undefined): boolean {
  if (typeof submitted !== "string" || !storedHash) return false;
  const a = Buffer.from(hashActivationCode(submitted));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}
