import { randomBytes } from "crypto";

export function generateRandomPassword(length = 14): string {
  return randomBytes(length)
    .toString("base64url")
    .slice(0, length);
}
