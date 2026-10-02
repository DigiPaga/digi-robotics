import cors from "cors";
import express from "express";
import type { AgentDemoEnv } from "./config/env";
import { createAgentDemoRouter } from "./routes/agentDemo";
import { safeErrorMessage } from "./utils/redact";

export interface AppOptions {
  /**
   * How the buyer agent reaches paid resources. Defaults to the global fetch. A host that can
   * answer requests for this server in-process (the Cloudflare Worker) passes its own.
   */
  buyerFetch?: typeof fetch;
}

export function createApp(env: AgentDemoEnv, options: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  // origin: true (reflect any Origin) is intentional, not an oversight (DR-C-11). This is a public
  // x402 resource server: every route is either unauthenticated (catalog, compatibility, health) or
  // authenticated by an x402 payment signature / download-link signature, never by a cookie or
  // session. There is nothing here for a malicious page to ride on with a victim's credentials, so
  // the usual CSRF-via-CORS concern that `credentials: true` + a reflected origin would create does
  // not apply (this app never sets `credentials: true`). Any agent or browser, on any origin, is a
  // legitimate caller of this API by design.
  app.use(cors({ origin: true, methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "Idempotency-Key", "Last-Event-ID", "PAYMENT-SIGNATURE", "X-PAYMENT"] }));
  app.use(express.json({ limit: "64kb" }));
  app.get("/", (_req, res) => res.json({ message: "DigiRobotics x402 v2 server", status: "healthy", mode: env.mode }));
  app.get("/health", (_req, res) => res.json({ status: "ok", mode: env.mode, timestamp: new Date().toISOString() }));
  app.use(createAgentDemoRouter(env, undefined, options.buyerFetch));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`[agent-demo] ${safeErrorMessage(error)}`);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "The server could not complete the request." });
  });
  return app;
}
