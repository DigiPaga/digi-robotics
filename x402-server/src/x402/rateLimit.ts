import type { NextFunction, Request, RequestHandler, Response } from "express";
import { decodePaymentSignatureHeader } from "@x402/core/http";

export interface PaidRouteRateLimit {
  /** Fixed window length in milliseconds. */
  windowMs: number;
  /** Requests per client IP per window, paid or not. 0 disables the IP limit. */
  perIp: number;
  /** Payment attempts per payer address per window. 0 disables the payer limit. */
  perPayer: number;
}

/** Fixed-window counter keyed by an arbitrary string. In-memory: limits apply per process. */
class WindowCounter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly windowMs: number, private readonly now: () => number) {}

  /** Counts one hit; returns the milliseconds until the window resets if `limit` is exceeded. */
  hit(key: string, limit: number): number | undefined {
    const now = this.now();
    if (this.hits.size > 10_000) this.prune(now);
    let entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.hits.set(key, entry);
    }
    entry.count += 1;
    return entry.count > limit ? entry.resetAt - now : undefined;
  }

  private prune(now: number) {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}

/** The authorizer of the payment carried by the request, if it decodes to one. */
export function paymentPayer(req: Request): string | undefined {
  const header = req.header("payment-signature") || req.header("x-payment");
  if (!header) return undefined;
  try {
    const payload = decodePaymentSignatureHeader(header).payload as { authorization?: { from?: unknown }; permit2Authorization?: { from?: unknown } };
    const from = payload.authorization?.from ?? payload.permit2Authorization?.from;
    return typeof from === "string" && /^0x[0-9a-fA-F]{40}$/.test(from) ? from.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Rate limit for the paid dataset route. Every request counts against the client IP; requests that
 * carry a payment also count against the payer, because each one makes the in-process facilitator
 * verify (RPC calls) and possibly settle (gas). Over the limit the request gets 429 before any of
 * that work happens.
 */
export function createPaidRouteRateLimit(config: PaidRouteRateLimit, now: () => number = Date.now): RequestHandler {
  const byIp = new WindowCounter(config.windowMs, now);
  const byPayer = new WindowCounter(config.windowMs, now);

  const reject = (res: Response, retryAfterMs: number, scope: "ip" | "payer") => {
    res.setHeader("Retry-After", String(Math.ceil(retryAfterMs / 1_000)));
    res.status(429).json({ error: "RATE_LIMITED", scope, message: "Too many requests for paid resources; retry later." });
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (config.perIp > 0) {
      const retry = byIp.hit(req.ip ?? req.socket.remoteAddress ?? "unknown", config.perIp);
      if (retry !== undefined) return reject(res, retry, "ip");
    }
    if (config.perPayer > 0) {
      const payer = paymentPayer(req);
      if (payer) {
        const retry = byPayer.hit(payer, config.perPayer);
        if (retry !== undefined) return reject(res, retry, "payer");
      }
    }
    next();
  };
}
