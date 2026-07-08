// Same phone number can be typed many ways ("+48 600 000 000", "600-000-000",
// "0048600000000"). Loyalty cards are keyed by this string, so without a
// canonical form the same customer silently ends up with multiple cards.
export function normalizePhone(raw: string): string {
  const stripped = raw.trim().replace(/[^\d+]/g, "");
  const hasLeadingPlus = stripped.startsWith("+");
  const digits = stripped.replace(/\+/g, "");

  if (hasLeadingPlus) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.length === 9) return `+48${digits}`; // bare Polish local number
  return `+${digits}`;
}
