import { getAddress, isAddress, zeroAddress, type Address } from "viem";
import { z } from "zod";
import { opsArbitrumSepolia, opsRobinhoodTestnet } from "./chains";

export interface OpsWallet {
  label: string;
  address: Address;
  role: string;
  /** Low-balance threshold in ETH. 0 disables the badge. */
  minEth: number;
}

export const DEFAULT_OPS_WALLETS: readonly OpsWallet[] = [
  {
    label: "Deployer",
    address: "0x962B67f92E9BAfc3A584fe2EA3ad871AcA3509d6",
    role: "Owner / deployer",
    minEth: 0.01,
  },
  {
    label: "Settler",
    address: "0xd98aC3064B36dFb19b62558d48cB16f00105F473",
    role: "x402 settler (pays gas per settlement)",
    minEth: 0.005,
  },
];

const walletSchema = z.object({
  label: z.string().trim().min(1).max(60),
  address: z.string().refine((value) => isAddress(value, { strict: false }), "invalid address"),
  role: z.string().trim().max(120).default(""),
  minEth: z.coerce.number().finite().min(0).max(100).default(0),
});

export interface ParsedWallets {
  wallets: OpsWallet[];
  /** Set when OPS_WALLETS was present but unusable; defaults are used instead. */
  warning: string | null;
}

type Env = Record<string, string | undefined>;

export function parseOpsWallets(raw: string | undefined): ParsedWallets {
  if (!raw?.trim()) return { wallets: [...DEFAULT_OPS_WALLETS], warning: null };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { wallets: [...DEFAULT_OPS_WALLETS], warning: "OPS_WALLETS is not valid JSON. Showing the default wallets." };
  }
  const parsed = z.array(walletSchema).min(1).max(20).safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? ` at ${issue.path.join(".")}` : "";
    return { wallets: [...DEFAULT_OPS_WALLETS], warning: `OPS_WALLETS is invalid${where}: ${issue?.message ?? "unknown error"}. Showing the default wallets.` };
  }
  const seen = new Set<string>();
  const wallets: OpsWallet[] = [];
  for (const item of parsed.data) {
    const address = getAddress(item.address);
    if (seen.has(address)) continue;
    seen.add(address);
    wallets.push({ label: item.label, address, role: item.role, minEth: item.minEth });
  }
  return { wallets, warning: null };
}

function envAddress(value: string | undefined): Address | null {
  const trimmed = value?.trim();
  if (!trimmed || !isAddress(trimmed, { strict: false })) return null;
  const address = getAddress(trimmed);
  return address === zeroAddress ? null : address;
}

/**
 * Operational wallets plus the x402 treasury (X402_PAY_TO) when set. The
 * treasury receives mUSDG and does not spend gas, so it has no ETH threshold.
 */
export function readOpsWallets(env: Env = process.env): ParsedWallets {
  const result = parseOpsWallets(env.OPS_WALLETS);
  const treasury = envAddress(env.X402_PAY_TO);
  if (treasury && !result.wallets.some((wallet) => wallet.address === treasury)) {
    result.wallets.push({ label: "Treasury", address: treasury, role: "x402 payTo (receives mUSDG)", minEth: 0 });
  }
  return result;
}

/** mUSDG token per chain, using the same env names as the checkout. Missing means "not shown". */
export function readMusdgTokens(env: Env = process.env): Record<number, Address | null> {
  return {
    [opsArbitrumSepolia.id]:
      envAddress(env.NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA) ?? envAddress(env.NEXT_PUBLIC_MOCK_USDG_ADDRESS),
    [opsRobinhoodTestnet.id]: envAddress(env.NEXT_PUBLIC_MOCK_USDG_ADDRESS_ROBINHOOD),
  };
}
