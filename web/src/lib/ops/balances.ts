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

function clientFor(chain: Chain) {
  return createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0], { timeout: RPC_TIMEOUT_MS, retryCount: 1 }) });
}

export function isLowBalance(wei: bigint, minEth: number): boolean {
  if (!(minEth > 0)) return false;
  return wei < parseEther(minEth.toFixed(18));
}

async function readCell(chain: Chain, wallet: OpsWallet, token: Address | null): Promise<BalanceCell> {
  const client = clientFor(chain);
  const [eth, musdg] = await Promise.allSettled([
    client.getBalance({ address: wallet.address }),
    token
      ? Promise.all([
          client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [wallet.address] }),
          client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
        ])
      : Promise.resolve(null),
  ]);
  const cell: BalanceCell = { chainId: chain.id, ethWei: null, eth: null, low: false, musdg: null, error: null };
  if (eth.status === "fulfilled") {
    cell.ethWei = eth.value.toString();
    cell.eth = formatEther(eth.value);
    cell.low = isLowBalance(eth.value, wallet.minEth);
  } else {
    cell.error = "RPC unavailable";
  }
  if (musdg.status === "fulfilled" && musdg.value) {
    const [balance, decimals] = musdg.value;
    cell.musdg = formatUnits(balance, decimals);
  } else if (musdg.status === "rejected") {
    cell.error = cell.error ?? "mUSDG read failed";
  }
  return cell;
}

/** Server-side balance snapshot for every configured wallet on every ops chain. */
export async function fetchOpsBalances(env: Record<string, string | undefined> = process.env): Promise<OpsBalancesSnapshot> {
  const { wallets, warning } = readOpsWallets(env);
  const tokens = readMusdgTokens(env);
  const rows = await Promise.all(
    wallets.map(async (wallet) => ({
      wallet,
      cells: await Promise.all(OPS_CHAINS.map((chain) => readCell(chain, wallet, tokens[chain.id] ?? null))),
    })),
  );
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
