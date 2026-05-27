/**
 * Kenya KRA PIN validation (11 characters: type letter + 9 digits + check letter).
 * Company PINs typically start with P; individuals with A.
 */

const KRA_PIN_RE = /^[A-Z][0-9]{9}[A-Z]$/;

export function normalizeKraPin(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidKraPin(raw: string | null | undefined): boolean {
  const pin = normalizeKraPin(raw);
  return pin.length === 11 && KRA_PIN_RE.test(pin);
}

export function kraPinValidationMessage(raw: string | null | undefined): string | null {
  const pin = normalizeKraPin(raw);
  if (!pin) return "KRA PIN is required.";
  if (pin.length !== 11) return "KRA PIN must be exactly 11 characters (e.g. P051234567X).";
  if (!KRA_PIN_RE.test(pin)) {
    return "Enter a valid KRA PIN: one letter, nine digits, then one letter (e.g. P051234567X).";
  }
  return null;
}
