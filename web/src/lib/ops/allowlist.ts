/**
 * Email allowlist for /ops.
 * Match is case-insensitive. For gmail.com and googlemail.com only, dots in the
 * local part are ignored (Google treats them as the same mailbox). Plus-tags
 * stay part of the address, so `me+x@gmail.com` is a different entry.
 * Addresses with non-ASCII characters are rejected outright.
 */
export function canonicalizeEmail(email: string): string {
  // Printable ASCII only. Unicode lookalikes and case-folding surprises (a
  // Cyrillic o, a dotless i) must never compare equal to an allowlisted address.
  if (!/^[\x21-\x7e]+$/.test(email.trim())) return "";
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return "";
  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replaceAll(".", "");
  return local ? `${local}@${domain}` : "";
}

/** Parses the comma separated `OPS_ALLOWED_EMAILS`. Unset or empty means nobody. */
export function parseAllowlist(raw: string | undefined): ReadonlySet<string> {
  const entries = (raw ?? "")
    .split(/[,\s]+/)
    .map(canonicalizeEmail)
    .filter(Boolean);
  return new Set(entries);
}

export function isAllowedEmail(email: string, allowlist: ReadonlySet<string>): boolean {
  if (allowlist.size === 0) return false;
  const canonical = canonicalizeEmail(email);
  return canonical !== "" && allowlist.has(canonical);
}
