import cors from "cors";
import express from "express";
import type { AgentDemoEnv } from "./config/env";
import { createAgentDemoRouter } from "./routes/agentDemo";
import { safeErrorMessage } from "./utils/redact";

export function createApp(env: AgentDemoEnv) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: true, methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "Idempotency-Key", "Last-Event-ID", "PAYMENT-SIGNATURE", "X-PAYMENT"] }));
  app.use(express.json({ limit: "64kb" }));
  app.get("/", (_req, res) => res.json({ message: "DigiRobotics x402 v2 server", status: "healthy", mode: env.mode }));
  app.get("/health", (_req, res) => res.json({ status: "ok", mode: env.mode, timestamp: new Date().toISOString() }));
  app.use(createAgentDemoRouter(env));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`[agent-demo] ${safeErrorMessage(error)}`);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "The server could not complete the request." });
  });
  return app;
}
