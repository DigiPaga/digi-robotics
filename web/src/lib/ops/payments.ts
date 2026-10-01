import "server-only";

import { decodeEventLog, formatUnits, getAddress, parseAbi, toEventSelector, zeroAddress, type Address, type Hex } from "viem";
import { memo } from "./cache";
import { OPS_CHAINS, type OpsChainId } from "./chains";
import { getOpsDeployment, MUSDG_DECIMALS, MUSDG_SYMBOL } from "./deployments";
import { hexToNumber, rpcBatch, rpcUrl, toHex, type RpcOptions } from "./rpc";

/**
 * Events as declared in contracts/src/interfaces/IX402Facilitator.sol,
 * contracts/src/interfaces/IERC3009.sol and OpenZeppelin ERC20.
 */
export const PAYMENT_EVENTS_ABI = parseAbi([
  "event PaymentSettled(bytes32 indexed resourceId, address indexed payer, address indexed payee, uint256 amount, bytes32 nonce, address settler)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)",
]);

const TOPIC_SETTLED = toEventSelector("PaymentSettled(bytes32,address,address,uint256,bytes32,address)");
const TOPIC_TRANSFER = toEventSelector("Transfer(address,address,uint256)");
const TOPIC_AUTH_USED = toEventSelector("AuthorizationUsed(address,bytes32)");

/**
 * - settled: EIP-3009 payment relayed through X402Facilitator (PaymentSettled in the same tx).
 * - authorization: EIP-3009 payment submitted straight to the token. The facilitator contract
 *   documents that these move funds without a PaymentSettled record.
 * - mint: faucet mint (Transfer from the zero address).
 * - transfer: any other token transfer.
 */
export type PaymentKind = "settled" | "authorization" | "mint" | "transfer";

export interface PaymentRow {
  chainId: number;
  kind: PaymentKind;
  txHash: Hex;
  logIndex: number;
  blockNumber: number;
  /** ISO time of the block, or null when the node did not report it. */
  timestamp: string | null;
  from: Address;
  to: Address;
  /** Atomic units as a decimal string (bigint is not JSON-safe). */
  amountAtomic: string;
  amount: string;
  resourceId: Hex | null;
  nonce: Hex | null;
  settler: Address | null;
}

export interface PaymentTotals {
  /** settled + authorization: transfers backed by a signed EIP-3009 authorization. */
  payments: number;
  settled: number;
  volumeAtomic: string;
  volume: string;
  uniquePayers: number;
  /** Mints and plain transfers, shown in the table but not counted as payments. */
  otherTransfers: number;
}

export interface LogRange {
  fromBlock: number;
  toBlock: number;
  /** True when the node refused the full range and a shorter recent window was read. */
  truncated: boolean;
}

export interface ChainPayments {
  chainId: number;
  name: string;
  explorer: string;
  ok: boolean;
  error: string | null;
  range: LogRange | null;
  totals: PaymentTotals;
  lastSettlement: PaymentRow | null;
  /** Newest first, at most MAX_ROWS_PER_CHAIN. */
  rows: PaymentRow[];
  /** Rows in range before the cap. */
  rowCount: number;
}

export interface PaymentsSnapshot {
  refreshedAt: string;
  token: { symbol: string; decimals: number };
  chains: ChainPayments[];
  totals: PaymentTotals;
}

export interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  blockTimestamp?: string;
  removed?: boolean;
}

export const MAX_ROWS_PER_CHAIN = 100;

/** Recent windows tried, in order, after a node refuses the range from the deploy block. */
export const FALLBACK_WINDOWS = [200_000, 20_000, 2_000] as const;

/** Blocks whose timestamp may be looked up when the node omits blockTimestamp on logs. */
const MAX_TIMESTAMP_LOOKUPS = 30;

const PAYMENTS_TTL_MS = 15_000;

interface Decoded {
  log: RawLog;
  index: number;
  block: number;
  topic: string;
}

function isRawLog(value: unknown): value is RawLog {
  const log = value as RawLog | null;
  return !!log && typeof log === "object" && typeof log.address === "string" && Array.isArray(log.topics)
    && typeof log.data === "string" && typeof log.transactionHash === "string"
    && typeof log.blockNumber === "string" && typeof log.logIndex === "string";
}

function decode<Name extends "PaymentSettled" | "Transfer" | "AuthorizationUsed">(log: RawLog, eventName: Name) {
  return decodeEventLog({ abi: PAYMENT_EVENTS_ABI, eventName, topics: log.topics as [Hex, ...Hex[]], data: log.data as Hex, strict: true });
}

/**
 * Turns raw logs of one chain into payment rows. Pure: no network.
 *
 * One row per token Transfer. A Transfer is a payment when the same transaction
 * also carries an AuthorizationUsed from the same account (EIP-3009), and it is
 * "settled" when the facilitator recorded a PaymentSettled with that nonce.
 * Logs from other addresses, removed (reorged) logs and undecodable logs are skipped.
 */
export function decodePaymentLogs(
  chainId: number,
  logs: readonly unknown[],
  contracts: { token: Address; facilitator: Address },
  timestamps: ReadonlyMap<number, number> = new Map(),
): PaymentRow[] {
  const token = contracts.token.toLowerCase();
  const facilitator = contracts.facilitator.toLowerCase();
  const byTx = new Map<string, Decoded[]>();
  for (const raw of logs) {
    if (!isRawLog(raw) || raw.removed) continue;
    const index = hexToNumber(raw.logIndex);
    const block = hexToNumber(raw.blockNumber);
    const topic = raw.topics[0];
    if (index === null || block === null || typeof topic !== "string") continue;
    const address = raw.address.toLowerCase();
    const relevant = (address === token && (topic === TOPIC_TRANSFER || topic === TOPIC_AUTH_USED))
      || (address === facilitator && topic === TOPIC_SETTLED);
    if (!relevant) continue;
    const list = byTx.get(raw.transactionHash) ?? [];
    list.push({ log: raw, index, block, topic });
    byTx.set(raw.transactionHash, list);
  }

  const rows: PaymentRow[] = [];
  for (const [txHash, entries] of byTx) {
    entries.sort((a, b) => a.index - b.index);
    const authorizations: { authorizer: string; nonce: Hex; index: number; used: boolean }[] = [];
    const settlements = new Map<string, { resourceId: Hex; settler: Address }>();
    for (const entry of entries) {
      try {
        if (entry.topic === TOPIC_AUTH_USED) {
          const { args } = decode(entry.log, "AuthorizationUsed");
          authorizations.push({ authorizer: args.authorizer.toLowerCase(), nonce: args.nonce, index: entry.index, used: false });
        } else if (entry.topic === TOPIC_SETTLED) {
          const { args } = decode(entry.log, "PaymentSettled");
          settlements.set(args.nonce.toLowerCase(), { resourceId: args.resourceId, settler: getAddress(args.settler) });
        }
      } catch {
        // Not the event shape we know: leave it out rather than guess.
      }
    }
    for (const entry of entries) {
      if (entry.topic !== TOPIC_TRANSFER) continue;
      let args: { from: Address; to: Address; value: bigint };
      try {
        args = decode(entry.log, "Transfer").args;
      } catch {
        continue;
      }
      const from = args.from.toLowerCase();
      // OpenZeppelin-style EIP-3009 emits AuthorizationUsed right before the Transfer it authorizes.
      const authorization = authorizations.find((item) => !item.used && item.authorizer === from && item.index < entry.index);
      if (authorization) authorization.used = true;
      const settlement = authorization ? settlements.get(authorization.nonce.toLowerCase()) : undefined;
      const kind: PaymentKind = settlement ? "settled" : authorization ? "authorization" : args.from === zeroAddress ? "mint" : "transfer";
      // Some nodes put blockTimestamp on logs, some omit it, and Arbitrum's eth_getLogs sends 0x0.
      const reported = hexToNumber(entry.log.blockTimestamp);
      const seconds = reported !== null && reported > 0 ? reported : timestamps.get(entry.block) ?? null;
      rows.push({
        chainId,
        kind,
        txHash: txHash as Hex,
        logIndex: entry.index,
        blockNumber: entry.block,
        timestamp: seconds === null ? null : new Date(seconds * 1000).toISOString(),
        from: getAddress(args.from),
        to: getAddress(args.to),
        amountAtomic: args.value.toString(),
        amount: formatUnits(args.value, MUSDG_DECIMALS),
        resourceId: settlement?.resourceId ?? null,
        nonce: authorization?.nonce ?? null,
        settler: settlement?.settler ?? null,
      });
    }
  }
  return rows.sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex);
}

function isPayment(row: PaymentRow): boolean {
  return row.kind === "settled" || row.kind === "authorization";
}

/** Count, volume and unique payers over any set of rows (one chain or all). Pure. */
export function summarizePayments(rows: readonly PaymentRow[]): PaymentTotals {
  let volume = BigInt(0);
  let payments = 0;
  let settled = 0;
  const payers = new Set<string>();
  for (const row of rows) {
    if (!isPayment(row)) continue;
    payments += 1;
    if (row.kind === "settled") settled += 1;
    volume += BigInt(row.amountAtomic);
    payers.add(row.from.toLowerCase());
  }
  return {
    payments,
    settled,
    volumeAtomic: volume.toString(),
    volume: formatUnits(volume, MUSDG_DECIMALS),
    uniquePayers: payers.size,
    otherTransfers: rows.length - payments,
  };
}

const EMPTY_TOTALS: PaymentTotals = summarizePayments([]);

function logsCall(addresses: readonly Address[], fromBlock: number) {
  return {
    method: "eth_getLogs",
    params: [{ address: addresses, topics: [[TOPIC_SETTLED, TOPIC_TRANSFER, TOPIC_AUTH_USED]], fromBlock: toHex(fromBlock), toBlock: "latest" }],
  };
}

interface ChainRead {
  ok: boolean;
  error: string | null;
  range: LogRange | null;
  rows: PaymentRow[];
}

/**
 * Reads one chain. Request budget: 1 batch in the normal case (block number +
 * logs from the deploy block), at most FALLBACK_WINDOWS.length more when the
 * node limits the range, and 1 more only when the node omits log timestamps.
 */
export async function readChainPayments(chainId: OpsChainId, options: RpcOptions = {}): Promise<ChainRead> {
  const chain = OPS_CHAINS.find((item) => item.id === chainId)!;
  const deployment = getOpsDeployment(chainId);
  const token = deployment.MockUSDG.address;
  const facilitator = deployment.X402Facilitator.address;
  const addresses = [facilitator, token];
  const url = rpcUrl(chain);
  const deployBlock = Math.min(deployment.MockUSDG.deployBlock, deployment.X402Facilitator.deployBlock);

  const first = await rpcBatch(url, [{ method: "eth_blockNumber", params: [] }, logsCall(addresses, deployBlock)], options);
  const [headResult, logsResult] = first.results;
  const head = headResult.ok ? hexToNumber(headResult.result) : null;
  if (head === null) return { ok: false, error: "RPC unavailable", range: null, rows: [] };

  let logs: unknown[] | null = logsResult.ok && Array.isArray(logsResult.result) ? logsResult.result : null;
  let fromBlock = deployBlock;
  let truncated = false;
  if (logs === null && !logsResult.ok && logsResult.reason === "limit") {
    for (const window of FALLBACK_WINDOWS) {
      fromBlock = Math.max(deployBlock, head - window);
      const retry = await rpcBatch(url, [logsCall(addresses, fromBlock)], options);
      const result = retry.results[0];
      if (result.ok && Array.isArray(result.result)) {
        logs = result.result;
        truncated = fromBlock > deployBlock;
        break;
      }
      if (result.ok || result.reason !== "limit") break;
    }
  }
  if (logs === null) {
    const limited = !logsResult.ok && logsResult.reason === "limit";
    return { ok: false, error: limited ? "RPC refused the log range" : "Log query failed", range: null, rows: [] };
  }

  let rows = decodePaymentLogs(chainId, logs, { token, facilitator });
  const missing = [...new Set(rows.filter((row) => row.timestamp === null).map((row) => row.blockNumber))].slice(0, MAX_TIMESTAMP_LOOKUPS);
  if (missing.length > 0) {
    const blocks = await rpcBatch(url, missing.map((block) => ({ method: "eth_getBlockByNumber", params: [toHex(block), false] })), options);
    const timestamps = new Map<number, number>();
    blocks.results.forEach((result, index) => {
      const seconds = result.ok ? hexToNumber((result.result as { timestamp?: unknown } | null)?.timestamp) : null;
      if (seconds !== null) timestamps.set(missing[index], seconds);
    });
    rows = decodePaymentLogs(chainId, logs, { token, facilitator }, timestamps);
  }
  return { ok: true, error: null, range: { fromBlock, toBlock: head, truncated }, rows };
}

export async function fetchPayments(options: RpcOptions & { fresh?: boolean } = {}): Promise<PaymentsSnapshot> {
  const { fresh, ...rpcOptions } = options;
  return memo("payments", PAYMENTS_TTL_MS, async () => {
    const reads = await Promise.all(OPS_CHAINS.map((chain) => readChainPayments(chain.id, rpcOptions).catch((): ChainRead => ({ ok: false, error: "RPC unavailable", range: null, rows: [] }))));
    const chains = OPS_CHAINS.map((chain, index): ChainPayments => {
      const read = reads[index];
      return {
        chainId: chain.id,
        name: chain.name,
        explorer: chain.blockExplorers.default.url,
        ok: read.ok,
        error: read.error,
        range: read.range,
        totals: read.ok ? summarizePayments(read.rows) : EMPTY_TOTALS,
        lastSettlement: read.rows.find(isPayment) ?? null,
        rows: read.rows.slice(0, MAX_ROWS_PER_CHAIN),
        rowCount: read.rows.length,
      };
    });
    return {
      refreshedAt: new Date().toISOString(),
      token: { symbol: MUSDG_SYMBOL, decimals: MUSDG_DECIMALS },
      chains,
      // Over every decoded row, not only the capped ones, so a payer on both chains counts once.
      totals: summarizePayments(reads.flatMap((read) => read.rows)),
    };
  }, { fresh });
}
