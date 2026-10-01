import "server-only";

import { decodeFunctionResult, encodeFunctionData, getAddress, parseAbi, type Address, type Hex } from "viem";
import { memo } from "./cache";
import { OPS_CHAINS, type OpsChainId } from "./chains";
import { getOpsDeployment, MUSDG_DECIMALS, OPS_CONTRACT_KEYS, OPS_SETTLER, type OpsContractKey } from "./deployments";
import { ethCall, rpcBatch, rpcUrl, type RpcCall, type RpcOptions, type RpcResult } from "./rpc";

/**
 * - ok: the call answered.
 * - absent: the call reverted or returned nothing, so the contract has no such function.
 * - error: the RPC failed, the value is unknown.
 */
export type Probe<T> = { status: "ok"; value: T } | { status: "absent" } | { status: "error" };

export interface ContractStatus {
  key: OpsContractKey;
  address: Address;
  deployBlock: number;
  /** null when the RPC failed. */
  codePresent: boolean | null;
  owner: Probe<Address>;
  paused: Probe<boolean>;
  /** MockUSDG only. */
  token: { name: Probe<string>; symbol: Probe<string>; version: Probe<string>; decimals: Probe<number>; decimalsMatch: boolean | null } | null;
  /** X402Facilitator only. */
  facilitator: {
    token: Probe<Address>;
    tokenMatches: boolean | null;
    settler: Address;
    settlerApproved: Probe<boolean>;
    pendingOwner: Probe<Address>;
  } | null;
}

export interface ChainContracts {
  chainId: number;
  name: string;
  explorer: string;
  reachable: boolean;
  contracts: ContractStatus[];
}

export interface ContractsSnapshot {
  refreshedAt: string;
  settler: Address;
  chains: ChainContracts[];
}

const ABI = parseAbi([
  "function owner() view returns (address)",
  "function pendingOwner() view returns (address)",
  "function paused() view returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function version() view returns (string)",
  "function decimals() view returns (uint8)",
  "function token() view returns (address)",
  "function isSettler(address operator) view returns (bool)",
]);

type FunctionName = "owner" | "pendingOwner" | "paused" | "name" | "symbol" | "version" | "decimals" | "token";

const CONTRACTS_TTL_MS = 30_000;
const ZERO = "0x0000000000000000000000000000000000000000";

function call(address: Address, functionName: FunctionName): RpcCall {
  return ethCall(address, encodeFunctionData({ abi: ABI, functionName }));
}

/** Decodes one eth_call answer. A revert or an empty return means the function is not there. */
export function probe<T>(result: RpcResult | undefined, functionName: FunctionName | "isSettler", map: (value: unknown) => T): Probe<T> {
  if (!result) return { status: "error" };
  if (!result.ok) return result.reason === "reverted" ? { status: "absent" } : { status: "error" };
  if (typeof result.result !== "string" || result.result === "0x") return { status: "absent" };
  try {
    return { status: "ok", value: map(decodeFunctionResult({ abi: ABI, functionName, data: result.result as Hex })) };
  } catch {
    return { status: "absent" };
  }
}

const asAddress = (value: unknown) => getAddress(value as string);
const asString = (value: unknown) => String(value).slice(0, 80);
const asBoolean = (value: unknown) => value === true;
const asNumber = (value: unknown) => Number(value);

/** Everything for one chain travels in one JSON-RPC batch: one request per chain. */
export async function readChainContracts(chainId: OpsChainId, options: RpcOptions = {}): Promise<ChainContracts> {
  const chain = OPS_CHAINS.find((item) => item.id === chainId)!;
  const deployment = getOpsDeployment(chainId);
  const calls: RpcCall[] = [];
  const at = new Map<string, number>();
  const add = (label: string, rpcCall: RpcCall) => { at.set(label, calls.length); calls.push(rpcCall); };

  for (const key of OPS_CONTRACT_KEYS) {
    const { address } = deployment[key];
    add(`${key}.code`, { method: "eth_getCode", params: [address, "latest"] });
    add(`${key}.owner`, call(address, "owner"));
    add(`${key}.paused`, call(address, "paused"));
  }
  const token = deployment.MockUSDG.address;
  for (const fn of ["name", "symbol", "version", "decimals"] as const) add(`MockUSDG.${fn}`, call(token, fn));
  const facilitator = deployment.X402Facilitator.address;
  add("X402Facilitator.token", call(facilitator, "token"));
  add("X402Facilitator.pendingOwner", call(facilitator, "pendingOwner"));
  add("X402Facilitator.isSettler", ethCall(facilitator, encodeFunctionData({ abi: ABI, functionName: "isSettler", args: [OPS_SETTLER] })));

  const batch = await rpcBatch(rpcUrl(chain), calls, options);
  const get = (label: string) => batch.results[at.get(label)!];

  const contracts = OPS_CONTRACT_KEYS.map((key): ContractStatus => {
    const { address, deployBlock } = deployment[key];
    const code = get(`${key}.code`);
    const status: ContractStatus = {
      key,
      address,
      deployBlock,
      codePresent: code?.ok ? typeof code.result === "string" && code.result.length > 2 : null,
      owner: probe(get(`${key}.owner`), "owner", asAddress),
      paused: probe(get(`${key}.paused`), "paused", asBoolean),
      token: null,
      facilitator: null,
    };
    if (key === "MockUSDG") {
      const decimals = probe(get("MockUSDG.decimals"), "decimals", asNumber);
      status.token = {
        name: probe(get("MockUSDG.name"), "name", asString),
        symbol: probe(get("MockUSDG.symbol"), "symbol", asString),
        version: probe(get("MockUSDG.version"), "version", asString),
        decimals,
        decimalsMatch: decimals.status === "ok" ? decimals.value === MUSDG_DECIMALS : null,
      };
    }
    if (key === "X402Facilitator") {
      const settles = probe(get("X402Facilitator.token"), "token", asAddress);
      const pending = probe(get("X402Facilitator.pendingOwner"), "pendingOwner", asAddress);
      status.facilitator = {
        token: settles,
        tokenMatches: settles.status === "ok" ? settles.value === token : null,
        settler: OPS_SETTLER,
        settlerApproved: probe(get("X402Facilitator.isSettler"), "isSettler", asBoolean),
        // The zero address means no ownership transfer is waiting to be accepted.
        pendingOwner: pending.status === "ok" && pending.value === ZERO ? { status: "absent" } : pending,
      };
    }
    return status;
  });

  return { chainId: chain.id, name: chain.name, explorer: chain.blockExplorers.default.url, reachable: batch.reachable, contracts };
}

export async function fetchContracts(options: RpcOptions & { fresh?: boolean } = {}): Promise<ContractsSnapshot> {
  const { fresh, ...rpcOptions } = options;
  return memo("contracts", CONTRACTS_TTL_MS, async () => ({
    refreshedAt: new Date().toISOString(),
    settler: OPS_SETTLER,
    chains: await Promise.all(OPS_CHAINS.map((chain) => readChainContracts(chain.id, rpcOptions))),
  }), { fresh });
}

export interface ContractsHealth {
  /** Contracts whose code check came back empty. */
  missingCode: number;
  /** Contracts that report paused() == true. */
  paused: number;
  /** Chains where the configured settler is not approved on the facilitator. */
  settlerNotApproved: number;
  /** Chains where the facilitator settles a token other than the recorded MockUSDG. */
  tokenMismatch: number;
  /** Values that could not be read because an RPC failed. */
  unknown: number;
  total: number;
}

/** Pure roll-up used by the overview. */
export function summarizeContracts(snapshot: ContractsSnapshot): ContractsHealth {
  const health: ContractsHealth = { missingCode: 0, paused: 0, settlerNotApproved: 0, tokenMismatch: 0, unknown: 0, total: 0 };
  for (const chain of snapshot.chains) {
    for (const contract of chain.contracts) {
      health.total += 1;
      if (contract.codePresent === null) health.unknown += 1;
      else if (!contract.codePresent) health.missingCode += 1;
      if (contract.paused.status === "ok" && contract.paused.value) health.paused += 1;
      if (contract.paused.status === "error") health.unknown += 1;
      if (contract.facilitator) {
        const { settlerApproved, tokenMatches } = contract.facilitator;
        if (settlerApproved.status === "error") health.unknown += 1;
        else if (!(settlerApproved.status === "ok" && settlerApproved.value)) health.settlerNotApproved += 1;
        if (tokenMatches === false) health.tokenMismatch += 1;
      }
    }
  }
  return health;
}
