import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC_URL =
  process.env.ROBINHOOD_TESTNET_RPC ||
  "https://rpc.testnet.chain.robinhood.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

// Robinhood Chain configuration
const robinhoodChain = {
  id: 46630,
  name: "Robinhood Testnet",
  network: "robinhood-testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  chain: robinhoodChain,
  transport: http(RPC_URL),
  account: PRIVATE_KEY ? privateKeyToAccount(PRIVATE_KEY) : undefined,
});

export interface RobinhoodSettlementRequest {
  assetId: number;
  buyer: string;
  agent: string;
  amount: bigint;
  tokenAddress: string;
}

export const settleOnRobinhood = async (
  request: RobinhoodSettlementRequest,
): Promise<string> => {
  try {
    // Simulate settlement on Robinhood Chain
    const txHash = await walletClient.sendTransaction({
      to: request.buyer as `0x${string}`,
      value: 0n,
    } as any);

    console.log();
    return txHash;
  } catch (error) {
    console.error("Robinhood settlement failed:", error);
    throw new Error("Failed to settle on Robinhood Chain");
  }
};

export const verifyRobinhoodTransaction = async (
  txHash: string,
): Promise<boolean> => {
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });
    return receipt.status === "success";
  } catch (error) {
    console.error("Robinhood transaction verification failed:", error);
    return false;
  }
};

export const getRobinhoodBlockNumber = async (): Promise<bigint> => {
  return await publicClient.getBlockNumber();
};
