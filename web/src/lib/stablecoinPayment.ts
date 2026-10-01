import {
  encode,
  getContract,
  prepareContractCall,
  readContract,
  type ThirdwebClient,
} from "thirdweb";
import type { Account as ThirdwebAccount } from "thirdweb/wallets";
import {
  createPublicClient,
  formatUnits,
  http,
  isAddress,
  parseUnits,
  type Address,
  type Hex,
  type LocalAccount,
} from "viem";
import { toAccount } from "viem/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  constants,
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { arbitrumSepolia, thirdwebClient } from "@/lib/thirdweb";
import { arbitrumSepolia as configuredCheckoutChain } from "@/lib/chains";
import { getStablecoinConfig } from "@/lib/stablecoinConfig";
import { isUsdGCompatibleSymbol } from "@/lib/network-utils";

const checkoutAsset = getStablecoinConfig(configuredCheckoutChain.id);

type SmartAccountRuntime = Awaited<ReturnType<typeof createSmartAccountRuntime>>;

export type StablecoinWallet = {
  ownerAddress: Address;
  smartAccountAddress: Address;
  balance: string;
  decimals: number;
};

export type PaymentProgress = "preparing" | "requesting_signature" | "submitted" | "confirming" | "confirmed";
export type PaymentProgressHandler = (stage: PaymentProgress, hash?: Hex) => void;
export type WalletProgress = "initializing_smart_account" | "loading_balance";
export type WalletProgressHandler = (stage: WalletProgress) => void;

function codedError(code: string, message: string, cause?: unknown): Error & { code: string } {
  return Object.assign(new Error(message, cause === undefined ? undefined : { cause }), { code });
}

function assertUsdGCompatibleAsset(): void {
  if (!isUsdGCompatibleSymbol(checkoutAsset.symbol)) {
    throw codedError("UNSUPPORTED_ASSET", "A USDG-compatible asset is not configured for checkout.");
  }
}

function contractAddress(name: "token" | "store"): Address {
  const raw = name === "token"
    ? checkoutAsset.address
    : process.env.NEXT_PUBLIC_STORE_WALLET_ADDRESS?.trim();
  if (!raw) throw codedError("CONFIGURATION_ERROR", `The checkout ${name} address is not configured.`);
  if (!isAddress(raw)) throw new Error(`The configured ${name} address is invalid.`);
  return raw;
}

function zeroDevRpcUrl() {
  const explicit = process.env.NEXT_PUBLIC_ZERODEV_RPC_URL?.trim();
  if (explicit) return explicit;
  const projectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID?.trim();
  if (!projectId) throw new Error("ZeroDev is not configured. Add NEXT_PUBLIC_ZERODEV_PROJECT_ID before checkout.");
  return `https://rpc.zerodev.app/api/v3/${projectId}/chain/${configuredCheckoutChain.id}`;
}

function toViemOwner(account: ThirdwebAccount): LocalAccount {
  return toAccount({
    address: account.address as Address,
    async signMessage({ message }) {
      return account.signMessage({ message });
    },
    async signTypedData(typedData) {
      return account.signTypedData(typedData as never);
    },
    async signTransaction() {
      throw new Error("The ZeroDev smart account signer never signs raw transactions.");
    },
  }) as LocalAccount;
}

async function createSmartAccountRuntime(account: ThirdwebAccount) {
  const bundlerUrl = zeroDevRpcUrl();
  const publicClient = createPublicClient({
    chain: configuredCheckoutChain,
    transport: http(configuredCheckoutChain.rpcUrls.default.http[0]),
  });
  const entryPoint = { address: entryPoint07Address, version: "0.7" as const };
  const owner = toViemOwner(account);
  const validator = await signerToEcdsaValidator(publicClient, {
    signer: owner,
    entryPoint,
    kernelVersion: constants.KERNEL_V3_1,
  });
  const kernelAccount = await createKernelAccount(publicClient, {
    plugins: { sudo: validator },
    entryPoint,
    kernelVersion: constants.KERNEL_V3_1,
  });
  const paymasterClient = createZeroDevPaymasterClient({
    chain: configuredCheckoutChain,
    transport: http(bundlerUrl),
  });
  const client = createKernelAccountClient({
    account: kernelAccount,
    chain: configuredCheckoutChain,
    client: publicClient,
    bundlerTransport: http(bundlerUrl),
    paymaster: {
      getPaymasterStubData: async (userOperation) => paymasterClient.sponsorUserOperation({
        userOperation,
        shouldConsume: false,
      }),
      getPaymasterData: async (userOperation) => paymasterClient.sponsorUserOperation({
        userOperation,
        shouldConsume: true,
      }),
    },
  });
  return { account: kernelAccount, client, publicClient };
}

function tokenContract(client: ThirdwebClient = thirdwebClient) {
  return getContract({ client, chain: arbitrumSepolia, address: contractAddress("token") });
}

async function readTokenDecimals() {
  const value = await readContract({
    contract: tokenContract(),
    method: "function decimals() view returns (uint8)",
  });
  const decimals = Number(value);
  if (decimals !== checkoutAsset.decimals) {
    throw codedError("UNSUPPORTED_ASSET", "The configured checkout asset decimals do not match the token contract.");
  }
  return decimals;
}

export async function getStablecoinWallet(account: ThirdwebAccount, onProgress?: WalletProgressHandler): Promise<StablecoinWallet> {
  assertUsdGCompatibleAsset();
  onProgress?.("initializing_smart_account");
  const runtime = await createSmartAccountRuntime(account);
  onProgress?.("loading_balance");
  const decimals = await readTokenDecimals();
  const balance = await readContract({
    contract: tokenContract(),
    method: "function balanceOf(address) view returns (uint256)",
    params: [runtime.account.address],
  });
  return {
    ownerAddress: account.address as Address,
    smartAccountAddress: runtime.account.address,
    balance: formatUnits(balance, decimals),
    decimals,
  };
}

async function sendSponsoredCall(runtime: SmartAccountRuntime, data: Hex, onProgress?: PaymentProgressHandler) {
  onProgress?.("requesting_signature");
  try {
    const submittedHash = await runtime.client.sendTransaction({
      to: contractAddress("token"),
      data,
      value: BigInt(0),
    });
    let confirmedHash = submittedHash;
    let replacementReason: "cancelled" | "replaced" | "repriced" | undefined;
    onProgress?.("submitted", submittedHash);
    onProgress?.("confirming", submittedHash);
    const receipt = await runtime.publicClient.waitForTransactionReceipt({
      hash: submittedHash,
      confirmations: 1,
      timeout: 180_000,
      onReplaced: ({ reason, transaction }) => {
        replacementReason = reason;
        confirmedHash = transaction.hash;
      },
    });
    if (replacementReason === "cancelled") {
      throw codedError("TRANSACTION_CANCELLED", "The transaction was cancelled before confirmation.");
    }
    if (receipt.status !== "success") {
      throw codedError("RECEIPT_FAILED", "The transaction receipt reported a failed execution.");
    }
    onProgress?.("confirmed", confirmedHash);
    return { hash: confirmedHash, receipt };
  } catch (error) {
    if (error instanceof Error && "code" in error) throw error;
    throw codedError("SMART_ACCOUNT_TRANSACTION_FAILED", "The sponsored smart-account transaction could not be completed.", error);
  }
}

/**
 * MockUSDG's faucet allows one claim per address per day. Check before asking the user to sign a
 * sponsored call that would revert; tokens without a cooldown (the legacy deployment) skip this.
 */
async function assertFaucetAvailable(runtime: SmartAccountRuntime) {
  let availableAt: bigint;
  let now: bigint;
  try {
    [availableAt, { timestamp: now }] = await Promise.all([
      readContract({
        contract: tokenContract(),
        method: "function nextFaucetAt(address account) view returns (uint256)",
        params: [runtime.account.address],
      }),
      runtime.publicClient.getBlock({ blockTag: "latest" }),
    ]);
  } catch {
    return;
  }
  if (now < availableAt) {
    throw Object.assign(
      codedError("FAUCET_COOLDOWN_ACTIVE", "The demo faucet cooldown is still active for this wallet."),
      { availableAt: new Date(Number(availableAt) * 1_000) },
    );
  }
}

export async function fundDemoWallet(account: ThirdwebAccount, onProgress?: PaymentProgressHandler) {
  assertUsdGCompatibleAsset();
  const runtime = await createSmartAccountRuntime(account);
  await assertFaucetAvailable(runtime);
  const call = prepareContractCall({
    contract: tokenContract(),
    method: "function faucet()",
  });
  const result = await sendSponsoredCall(runtime, await encode(call), onProgress);
  return { ...result, smartAccountAddress: runtime.account.address };
}

export async function executeStablecoinPayment(account: ThirdwebAccount, total: string, onProgress?: PaymentProgressHandler) {
  assertUsdGCompatibleAsset();
  onProgress?.("preparing");
  const decimals = await readTokenDecimals();
  const amount = parseUnits(total, decimals);
  if (amount <= BigInt(0)) throw new Error("The checkout total must be greater than zero.");
  const runtime = await createSmartAccountRuntime(account);
  const call = prepareContractCall({
    contract: tokenContract(),
    method: "function transfer(address to, uint256 value) returns (bool)",
    params: [contractAddress("store"), amount],
  });
  const result = await sendSponsoredCall(runtime, await encode(call), onProgress);
  return { ...result, smartAccountAddress: runtime.account.address, amount, decimals };
}

export async function confirmStablecoinTransaction(hash: Hex): Promise<void> {
  const publicClient = createPublicClient({
    chain: configuredCheckoutChain,
    transport: http(configuredCheckoutChain.rpcUrls.default.http[0]),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 });
  if (receipt.status !== "success") {
    throw codedError("RECEIPT_FAILED", "The transaction receipt reported a failed execution.");
  }
}
