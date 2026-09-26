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
import { arbitrumSepolia as viemArbitrumSepolia } from "viem/chains";
import { entryPoint07Address } from "viem/account-abstraction";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  constants,
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { arbitrumSepolia, thirdwebClient } from "@/lib/thirdweb";
import { DEPLOYED_MOCK_USDG_ADDRESS, VERIFIED_STORE_WALLET_ADDRESS } from "@/lib/stablecoinConfig";
const EXECUTION_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

type SmartAccountRuntime = Awaited<ReturnType<typeof createSmartAccountRuntime>>;

export type StablecoinWallet = {
  ownerAddress: Address;
  smartAccountAddress: Address;
  balance: string;
  decimals: number;
};

function contractAddress(name: "token" | "store"): Address {
  const raw = name === "token"
    ? process.env.NEXT_PUBLIC_MOCK_USDG_ADDRESS?.trim() || DEPLOYED_MOCK_USDG_ADDRESS
    : process.env.NEXT_PUBLIC_STORE_WALLET_ADDRESS?.trim() || VERIFIED_STORE_WALLET_ADDRESS;
  if (!isAddress(raw)) throw new Error(`The configured ${name} address is invalid.`);
  return raw;
}

function zeroDevRpcUrl() {
  const explicit = process.env.NEXT_PUBLIC_ZERODEV_RPC_URL?.trim();
  if (explicit) return explicit;
  const projectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID?.trim();
  if (!projectId) throw new Error("ZeroDev is not configured. Add NEXT_PUBLIC_ZERODEV_PROJECT_ID before checkout.");
  return `https://rpc.zerodev.app/api/v3/${projectId}/chain/421614`;
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
  const publicClient = createPublicClient({ chain: viemArbitrumSepolia, transport: http(EXECUTION_RPC) });
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
    chain: viemArbitrumSepolia,
    transport: http(bundlerUrl),
  });
  const client = createKernelAccountClient({
    account: kernelAccount,
    chain: viemArbitrumSepolia,
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
  return { account: kernelAccount, client };
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
  if (decimals !== 6) throw new Error(`Mock USDG reports ${decimals} decimals; checkout requires 6.`);
  return decimals;
}

export async function getStablecoinWallet(account: ThirdwebAccount): Promise<StablecoinWallet> {
  const runtime = await createSmartAccountRuntime(account);
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

async function sendSponsoredCall(runtime: SmartAccountRuntime, data: Hex) {
  try {
    return await runtime.client.sendTransaction({
      to: contractAddress("token"),
      data,
      value: BigInt(0),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown ZeroDev error";
    throw new Error(`Gas sponsorship failed. Confirm the ZeroDev policy allows Arbitrum Sepolia calls to ${contractAddress("token")}. ${detail}`);
  }
}

export async function fundDemoWallet(account: ThirdwebAccount) {
  const runtime = await createSmartAccountRuntime(account);
  const call = prepareContractCall({
    contract: tokenContract(),
    method: "function faucet()",
  });
  const hash = await sendSponsoredCall(runtime, await encode(call));
  return { hash, smartAccountAddress: runtime.account.address };
}

export async function executeStablecoinPayment(account: ThirdwebAccount, total: string) {
  const decimals = await readTokenDecimals();
  const amount = parseUnits(total, decimals);
  if (amount <= BigInt(0)) throw new Error("The checkout total must be greater than zero.");
  const runtime = await createSmartAccountRuntime(account);
  const call = prepareContractCall({
    contract: tokenContract(),
    method: "function transfer(address to, uint256 value) returns (bool)",
    params: [contractAddress("store"), amount],
  });
  const hash = await sendSponsoredCall(runtime, await encode(call));
  return { hash, smartAccountAddress: runtime.account.address, amount, decimals };
}
