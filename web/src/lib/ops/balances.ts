import "server-only";

import { createPublicClient, erc20Abi, formatEther, formatUnits, http, parseEther, type Address, type Chain } from "viem";
import { OPS_CHAINS } from "./chains";
import { readMusdgTokens, readOpsWallets, type OpsWallet } from "./wallets";

export interface BalanceCell {
  chainId: number;
  /** Wei as a decimal string (bigint is not JSON-safe). Null when the RPC failed. */
  ethWei: string | null;
  eth: string | null;
  low: boolean;
  musdg: string | null;
  error: string | null;
}

export interface WalletBalances {
  wallet: OpsWallet;
  cells: BalanceCell[];
}

export interface OpsChainInfo {
  id: number;
  name: string;
  explorer: string;
  musdgToken: Address | null;
}

export interface OpsBalancesSnapshot {
  refreshedAt: string;
  chains: OpsChainInfo[];
  rows: WalletBalances[];
  warning: string | null;
}

const RPC_TIMEOUT_MS = 8_000;

/** Upper bound on the rows one snapshot reads, however long the configured list is. */
export const MAX_OPS_WALLETS = 10;

/**
 * One client per chain with JSON-RPC batching: every read issued in the same
 * tick travels in a single HTTP request, so a snapshot costs one request per
 * chain instead of up to three per wallet per chain. Each call still gets its
 * own result or error inside the batch.
 */
function clientFor(chain: Chain) {
  return createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0], { batch: true, timeout: RPC_TIMEOUT_MS, retryCount: 1 }),
  });
}

type OpsClient = ReturnType<typeof clientFor>;

export function isLowBalance(wei: bigint, minEth: number): boolean {
  if (!(minEth > 0)) return false;
  return wei < parseEther(minEth.toFixed(18));
}

async function readCell(
  client: OpsClient,
  chainId: number,
  wallet: OpsWallet,
  token: Address | null,
  decimals: Promise<number | null>,
): Promise<BalanceCell> {
  const [eth, musdg, tokenDecimals] = await Promise.allSettled([
    client.getBalance({ address: wallet.address }),
    token
      ? client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [wallet.address] })
      : Promise.resolve(null),
    decimals,
  ]);
  const cell: BalanceCell = { chainId, ethWei: null, eth: null, low: false, musdg: null, error: null };
  if (eth.status === "fulfilled") {
    cell.ethWei = eth.value.toString();
    cell.eth = formatEther(eth.value);
    cell.low = isLowBalance(eth.value, wallet.minEth);
  } else {
    cell.error = "RPC unavailable";
  }
  if (token) {
    const unit = tokenDecimals.status === "fulfilled" ? tokenDecimals.value : null;
    if (musdg.status === "fulfilled" && musdg.value !== null && unit !== null) {
      cell.musdg = formatUnits(musdg.value, unit);
    } else {
      cell.error = cell.error ?? "mUSDG read failed";
    }
  }
  return cell;
}

/** All cells of one chain. Everything here is issued in the same tick, so it is one batch. */
function readChain(chain: Chain, wallets: readonly OpsWallet[], token: Address | null): Promise<BalanceCell[]> {
  const client = clientFor(chain);
  // Decimals are a property of the token, not of the wallet: read once per chain.
  const decimals: Promise<number | null> = token
    ? client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => null)
    : Promise.resolve(null);
  return Promise.all(wallets.map((wallet) => readCell(client, chain.id, wallet, token, decimals)));
}

/** Server-side balance snapshot for the configured wallets (first MAX_OPS_WALLETS) on every ops chain. */
export async function fetchOpsBalances(env: Record<string, string | undefined> = process.env): Promise<OpsBalancesSnapshot> {
  const { wallets: configured, warning: configWarning } = readOpsWallets(env);
  const wallets = configured.slice(0, MAX_OPS_WALLETS);
  const capWarning = configured.length > wallets.length
    ? `Showing the first ${wallets.length} of ${configured.length} configured wallets.`
    : null;
  const warning = [configWarning, capWarning].filter(Boolean).join(" ") || null;
  const tokens = readMusdgTokens(env);
  const byChain = await Promise.all(OPS_CHAINS.map((chain) => readChain(chain, wallets, tokens[chain.id] ?? null)));
  const rows = wallets.map((wallet, index) => ({ wallet, cells: byChain.map((cells) => cells[index]) }));
  return {
    refreshedAt: new Date().toISOString(),
    chains: OPS_CHAINS.map((chain) => ({
      id: chain.id,
      name: chain.name,
      explorer: chain.blockExplorers.default.url,
      musdgToken: tokens[chain.id] ?? null,
    })),
    rows,
    warning,
  };
}
