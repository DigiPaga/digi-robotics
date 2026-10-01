import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { formatUnits } from "viem";
import type { AgentDemoEnv } from "../config/env";
import { createPublicDatasets, getPublicDataset } from "../data/datasets";
import { hasProtectedDataset, issueDatasetAccess, readProtectedDataset } from "../data/protectedDatasetContent";
import { BazaarFirstDiscovery, selectCandidate } from "../agent/discovery";
import { PolicyError, safeRequirements, validatePaymentPolicy } from "../agent/policy";
import { BuyerError, X402Buyer } from "../agent/x402Buyer";
import { RunStore } from "../agent/runStore";
import type { ErrorCode } from "../types/agentDemo";
import { safeErrorMessage } from "../utils/redact";
import { explorerTxUrl, getX402Chain, MOCK_USDG_TOKEN, X402_CHAINS } from "../x402/chains";
import { createProtectedDatasetMiddleware, type X402SettlementLocals } from "../x402/resourceServer";

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function mapErrorCode(error: unknown): ErrorCode {
  if (error instanceof BuyerError) return error.code as ErrorCode;
  if (error instanceof PolicyError) return "POLICY_REJECTED";
  if (error instanceof Error && /facilitator/i.test(error.message)) return "FACILITATOR_FAILURE";
  return "CONTENT_FAILURE";
}

export function createAgentDemoRouter(env: AgentDemoEnv, store = new RunStore(env.runTtlMs, env.maxConcurrentRuns, env.maxTotalSpendAtomic)) {
  const router = Router();
  const discovery = new BazaarFirstDiscovery(env);
  const paymentMiddleware = createProtectedDatasetMiddleware(env);

  router.get("/agent-demo/catalog", (_req, res) => res.json({ datasets: createPublicDatasets(env) }));

  router.get("/agent-demo/compatibility", (_req, res) => {
    let agentAddress: string | undefined;
    try { agentAddress = new X402Buyer(env).account.address; } catch { agentAddress = undefined; }
    res.json({
      selectedMode: env.mode,
      runtime: { node: process.version, minimumNode: ">=20.9.0", x402Version: 2 },
      mockUSDG: {
        symbol: MOCK_USDG_TOKEN.symbol,
        decimals: MOCK_USDG_TOKEN.decimals,
        eip712: { name: MOCK_USDG_TOKEN.name, version: MOCK_USDG_TOKEN.version },
        eip3009: true,
        networks: Object.values(X402_CHAINS).filter(chain => chain.supportsMockUsdg).map(chain => chain.network),
        selected: env.mode === "REAL_MUSDG_X402",
      },
      selectedAsset: { network: env.network, chainId: env.chainId, address: env.assetAddress, symbol: env.assetSymbol, decimals: env.assetDecimals, transferMethod: "eip3009" },
      facilitator: env.mode === "REAL_MUSDG_X402"
        ? { url: "in-process", settlement: env.settlementContract ? { via: "X402Facilitator", contract: env.settlementContract } : { via: "token.transferWithAuthorization" }, requiredCapability: { x402Version: 2, scheme: "exact", network: env.network } }
        : { url: env.facilitatorUrl, requiredCapability: { x402Version: 2, scheme: "exact", network: env.network } },
      buyer: { address: agentAddress, model: "server-side EOA signer", zeroDevUsed: false },
      seller: { address: env.payTo, distinctFromBuyer: agentAddress?.toLowerCase() !== env.payTo.toLowerCase() },
      thirdweb: { role: "human authentication/checkout only", usedByAgentDemo: false },
      price: `${env.priceDisplay} ${env.assetSymbol}`,
    });
  });

  router.post("/agent-demo/runs", (req, res) => {
    const idempotencyKey = String(req.header("idempotency-key") || randomUUID()).slice(0, 128);
    try {
      const { run, created } = store.create(idempotencyKey, env.mode);
      if (created) setImmediate(() => void executeRun(run.id, env, store, discovery));
      res.status(created ? 202 : 200).json({ runId: run.id, created, statusUrl: `/agent-demo/runs/${run.id}`, eventsUrl: `/agent-demo/runs/${run.id}/events` });
    } catch (error) {
      const concurrent = error instanceof Error && error.message === "CONCURRENCY_LIMIT";
      res.status(concurrent ? 429 : 500).json({ error: concurrent ? "CONCURRENCY_LIMIT" : "RUN_CREATION_FAILED" });
    }
  });

  router.get("/agent-demo/runs/:runId", (req, res) => {
    const run = store.get(req.params.runId);
    if (!run) return res.status(404).json({ error: "RUN_NOT_FOUND" });
    res.json(run);
  });

  router.get("/agent-demo/runs/:runId/events", (req, res) => {
    const run = store.get(req.params.runId);
    if (!run) return res.status(404).json({ error: "RUN_NOT_FOUND" });
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const lastId = Number(req.header("last-event-id") ?? 0);
    for (const event of run.events.filter(item => item.sequence > lastId)) {
      res.write(`id: ${event.sequence}\nevent: run\ndata: ${JSON.stringify(event)}\n\n`);
    }
    const unsubscribe = store.subscribe(run.id, event => res.write(`id: ${event.sequence}\nevent: run\ndata: ${JSON.stringify(event)}\n\n`));
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15_000);
    req.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
  });

  router.get("/x402/datasets/:id/content", (req, res, next) => {
    if (!hasProtectedDataset(req.params.id)) return res.status(404).json({ error: "DATASET_NOT_FOUND" });
    next();
  }, paymentMiddleware, (req: Request, res: Response) => {
    const dataset = getPublicDataset(env, req.params.id);
    const settlement = (res.locals as X402SettlementLocals).settlement;
    if (!dataset || !settlement?.success) return res.status(500).json({ error: "CONTENT_FAILURE" });
    const access = issueDatasetAccess(env.resourceBaseUrl, dataset.id);
    res.json({
      datasetId: dataset.id,
      title: dataset.title,
      ...access,
      payment: {
        network: settlement.network,
        assetSymbol: env.assetSymbol,
        amount: env.priceDisplay,
        transactionHash: settlement.transaction,
      },
    });
  });

  router.get("/x402/datasets/:id/download", (req, res) => {
    const content = readProtectedDataset(req.params.id, String(req.query.expires ?? ""), String(req.query.signature ?? ""));
    if (!content) return res.status(403).json({ error: "ACCESS_LINK_INVALID_OR_EXPIRED" });
    res.setHeader("Cache-Control", "private, no-store");
    res.json(content);
  });

  return router;
}

async function executeRun(runId: string, env: AgentDemoEnv, store: RunStore, discovery: BazaarFirstDiscovery): Promise<void> {
  try {
    if (env.mode === "BLOCKED") throw new BuyerError("CONFIGURATION_ERROR", "Compatibility mode is BLOCKED; configure a supported facilitator, asset, and funded signer");
    const buyer = new X402Buyer(env);
    store.emit(runId, "preflight", `Reading token metadata and buyer balance from ${getX402Chain(env.network)?.name ?? env.network}.`);
    const preflight = await buyer.preflight();
    store.emit(runId, "preflight", "Buyer preflight passed with onchain EIP-3009 token support.", {
      agentAddress: shortAddress(preflight.address),
      balance: `${preflight.balanceDisplay} ${preflight.symbol}`,
      network: env.network,
      asset: env.assetSymbol,
    });
    store.emit(runId, "searching", "Searching x402 Bazaar, then the local DigiRobotics registry through the same discovery interface.");
    const candidates = await discovery.search();
    store.emit(runId, "candidates_found", `Scored ${candidates.length} candidate resources.`, { candidates });
    const selected = selectCandidate(candidates);
    const run = store.get(runId);
    if (!run) return;
    run.selected = selected;
    store.emit(runId, "selected", `Selected ${selected.title}: ${selected.reasons.join(", ")}.`, { datasetId: selected.id, datasetTitle: selected.title, source: selected.source });
    store.emit(runId, "requesting_resource", "Requesting the protected resource without payment.", { datasetId: selected.id });
    const unpaid = await buyer.requestUnpaid(selected.resourceUrl);
    const requirement = safeRequirements(unpaid.requirement);
    run.requirements = requirement;
    store.emit(runId, "payment_required", "Server returned a genuine HTTP 402 with x402 v2 requirements.", {
      network: requirement.network,
      asset: env.assetSymbol,
      amount: `${formatUnits(BigInt(requirement.amount), env.assetDecimals)} ${env.assetSymbol}`,
      payTo: shortAddress(requirement.payTo),
      requirements: { ...requirement, payTo: shortAddress(requirement.payTo), asset: shortAddress(requirement.asset) },
    });
    store.emit(runId, "validating_policy", "Validating exact network, asset, scheme, host, recipient, amount, decimals, timeout, redirect, and one-payment limits.");
    validatePaymentPolicy(unpaid.requirement, selected.resourceUrl, env);
    if (!store.claimPayment(runId, BigInt(requirement.amount))) {
      throw new BuyerError("POLICY_REJECTED", "Payment was already attempted for this run or the process-wide demo spending budget is exhausted");
    }
    store.emit(runId, "signing_payment", "Creating the EIP-3009 payment authorization with the server-side agent signer.");
    const result = await buyer.payAndUnlock(
      selected.resourceUrl,
      unpaid.paymentRequired,
      () => store.emit(runId, "signing_payment", "Payment authorization signed; no private signing material was logged."),
      () => {
        store.emit(runId, "retrying_request", "Retrying the same resource with the x402 PAYMENT-SIGNATURE header.");
        store.emit(runId, "verifying", "The resource server is asking the facilitator to verify the authorization.");
        store.emit(runId, "settling", "Awaiting facilitator settlement before releasing the access payload.");
      },
    );
    const expectedDelta = BigInt(requirement.amount);
    if (result.sellerBalance - preflight.sellerBalance !== expectedDelta) {
      throw new BuyerError("SETTLEMENT_FAILURE", "Seller balance delta did not match the x402 payment amount");
    }
    run.result = result.unlocked;
    store.emit(runId, "unlocked", "Settlement confirmed onchain. The short-lived dataset access URL is now unlocked.", {
      datasetId: selected.id,
      datasetTitle: selected.title,
      network: env.network,
      asset: env.assetSymbol,
      amount: `${env.priceDisplay} ${env.assetSymbol}`,
      transactionHash: result.receipt.transaction,
      explorerUrl: explorerTxUrl(env.network, result.receipt.transaction),
    });
  } catch (error) {
    store.fail(runId, mapErrorCode(error), safeErrorMessage(error));
  }
}
