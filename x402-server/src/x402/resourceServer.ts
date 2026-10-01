import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ExpressAdapter } from "@x402/express";
import { HTTPFacilitatorClient, x402HTTPResourceServer, x402ResourceServer, withPrivateCacheControl } from "@x402/core/server";
import type { FacilitatorClient, HTTPRequestContext, RoutesConfig } from "@x402/core/server";
import type { SettleResponse } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension, declareDiscoveryExtension, validateBazaarRouteExtensions } from "@x402/extensions/bazaar";
import type { AgentDemoEnv } from "../config/env";
import { displayAmountToAtomic } from "../agent/policy";
import { createLocalFacilitator } from "./localFacilitator";
import { resourceIdFor } from "./settlementContractScheme";

export interface X402SettlementLocals {
  settlement: SettleResponse;
}

/**
 * REAL_MUSDG_X402 verifies and settles in-process (no hosted facilitator serves its chains);
 * the other modes keep using the HTTP facilitator at X402_FACILITATOR_URL.
 */
export function defaultFacilitator(env: AgentDemoEnv): FacilitatorClient {
  if (env.mode === "REAL_MUSDG_X402") return createLocalFacilitator(env);
  return new HTTPFacilitatorClient({ url: env.facilitatorUrl, timeoutMs: env.requestTimeoutMs });
}

const DATASET_CONTENT_PATH = /^\/x402\/datasets\/([^/]+)\/content\/?$/i;

/**
 * Canonical URL of the dataset a paid request is for, derived from the request path the route
 * matched. The settlement contract records keccak256 of this URL, so it must come from the server,
 * never from the client-supplied payload.resource (which @x402/core does not validate).
 */
export function datasetResourceUrl(resourceBaseUrl: string, requestPath: string): string {
  const match = DATASET_CONTENT_PATH.exec(requestPath);
  if (!match) throw new Error(`Not a dataset content path: ${requestPath}`);
  let id: string;
  try { id = decodeURIComponent(match[1]!); } catch { id = match[1]!; }
  return `${resourceBaseUrl}/x402/datasets/${encodeURIComponent(id)}/content`;
}

export function createProtectedDatasetMiddleware(
  env: AgentDemoEnv,
  facilitator: FacilitatorClient = defaultFacilitator(env),
): RequestHandler {
  const amount = displayAmountToAtomic(env.priceDisplay, env.assetDecimals).toString();
  const resourceServer = new x402ResourceServer(facilitator)
    .register(env.network, new ExactEvmScheme())
    .registerExtension(bazaarResourceServerExtension);

  const routes: RoutesConfig = {
    "GET /x402/datasets/:id/content": {
      accepts: {
        scheme: "exact",
        network: env.network,
        payTo: env.payTo,
        // The server derives the on-chain resource id per request and ships it in extra. The
        // facilitator settles against these server-built requirements, and a client that edits
        // extra.resourceId no longer matches them.
        price: (context: HTTPRequestContext) => ({
          asset: env.assetAddress,
          amount,
          extra: { resourceId: resourceIdFor(datasetResourceUrl(env.resourceBaseUrl, context.path)) },
        }),
        maxTimeoutSeconds: Math.floor(env.requestTimeoutMs / 1_000),
        extra: {
          paymentFlow: "upfront",
          assetTransferMethod: "eip3009",
          name: env.assetName,
          version: env.assetVersion,
        },
      },
      resource: `${env.resourceBaseUrl}/x402/datasets/:id/content`,
      description: "Purchase access to a DigiRobotics egocentric manipulation dataset.",
      mimeType: "application/vnd.digirobotics.dataset+json",
      serviceName: "DigiRobotics Dataset Exchange",
      tags: ["robotics", "training-data", "egocentric", "manipulation", "engine-assembly"],
      unpaidResponseBody: async () => ({
        contentType: "application/json",
        body: { error: "PAYMENT_REQUIRED", message: "A valid x402 v2 payment is required before dataset access is issued." },
      }),
      settlementFailedResponseBody: async (_context, result) => ({
        contentType: "application/json",
        body: { error: "SETTLEMENT_FAILURE", message: result.errorMessage ?? result.errorReason },
      }),
      extensions: declareDiscoveryExtension({
        pathParams: { id: "engine-assembly-pov" },
        pathParamsSchema: {
          properties: { id: { type: "string", enum: ["engine-assembly-pov", "kitchen-cooking-pov", "warehouse-picking-pov"] } },
          required: ["id"],
        },
        output: {
          schema: {
            type: "object",
            properties: {
              datasetId: { type: "string" },
              title: { type: "string" },
              signedUrl: { type: "string" },
              expiresAt: { type: "string" },
              payment: { type: "object" },
            },
            required: ["datasetId", "title", "signedUrl", "expiresAt", "payment"],
          },
        },
      }),
    },
  };
  validateBazaarRouteExtensions(routes);
  const httpServer = new x402HTTPResourceServer(resourceServer, routes);
  let initialization: Promise<void> | undefined;

  const initialize = () => {
    initialization ??= httpServer.initialize().catch(error => {
      initialization = undefined;
      throw error;
    });
    return initialization;
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    const adapter = new ExpressAdapter(req);
    const context = {
      adapter,
      path: req.path,
      decodedPath: (() => { try { return decodeURIComponent(req.path); } catch { return req.path; } })(),
      method: req.method,
      paymentHeader: adapter.getHeader("payment-signature") || adapter.getHeader("x-payment"),
    };
    if (!httpServer.requiresPayment(context)) return next();

    try {
      await initialize();
      const result = await httpServer.processHTTPRequest(context, { appName: "DigiRobotics", testnet: true });
      if (result.type === "no-payment-required") return next();
      if (result.type === "payment-error") {
        res.status(result.response.status);
        for (const [key, value] of Object.entries(result.response.headers)) res.setHeader(key, value);
        res.type(result.response.isHtml ? "html" : "json").send(result.response.body ?? {});
        return;
      }

      if (!result.beforeHandlerSettlement?.result.success) {
        res.status(402).json({ error: "SETTLEMENT_REQUIRED", message: "Dataset access requires confirmed settlement before the handler runs." });
        return;
      }
      const settlement = await httpServer.processSettlement(
        result.paymentPayload,
        result.paymentRequirements,
        result.declaredExtensions,
        { request: context },
        undefined,
        result.beforeHandlerSettlement,
      );
      if (!settlement.success) {
        res.status(settlement.response.status);
        for (const [key, value] of Object.entries(settlement.response.headers)) res.setHeader(key, value);
        res.json(settlement.response.body ?? {});
        return;
      }
      for (const [key, value] of Object.entries(settlement.headers)) res.setHeader(key, value);
      res.setHeader("Cache-Control", withPrivateCacheControl(res.getHeader("Cache-Control")?.toString() ?? null));
      (res.locals as X402SettlementLocals).settlement = settlement;
      next();
    } catch (error) {
      next(error);
    }
  };
}
