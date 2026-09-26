export type SupportedChainId = 421614 | 42161 | 46630;
export type IntegrationReadiness =
  | { ready: true; chainId: SupportedChainId; rpcUrl: string; projectId: string }
  | { ready: false; reason: "missing-config" | "unsupported-chain" };
export type SignerCapability = {
  address: `0x${string}`;
  signMessage?: (message: string) => Promise<`0x${string}`>;
  signTypedData?: (data: unknown) => Promise<`0x${string}`>;
};
