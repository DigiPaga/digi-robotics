const SENSITIVE_KEYS = /private.?key|secret|token|authorization|signature|wallet.?secret|jwt/i;
const HEX_PRIVATE_KEY = /0x[0-9a-fA-F]{64}/g;

export function redactSecrets<T>(value: T): T {
  if (typeof value === "string") return value.replace(HEX_PRIVATE_KEY, "[REDACTED]") as T;
  if (Array.isArray(value)) return value.map(redactSecrets) as T;
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) output[key] = SENSITIVE_KEYS.test(key) ? "[REDACTED]" : redactSecrets(item);
    return output as T;
  }
  return value;
}

export function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  return redactSecrets(message).slice(0, 500);
}
