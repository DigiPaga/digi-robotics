import type { Address } from "viem";
import { opsArbitrumSepolia, opsRobinhoodTestnet, type OpsChainId } from "./chains";

/**
 * Contracts the ops console reads, per chain. Public configuration, safe for
 * the client bundle.
 *
 * The source of truth is the Foundry output: contracts/deployments/x402-<chainId>.json
 * for MockUSDG and X402Facilitator, and the broadcast receipts for the two
 * marketplace contracts and for every deploy block. deployments.test.ts reads
 * those files and fails when this table drifts from them.
 */
export type OpsContractKey = "MockUSDG" | "X402Facilitator" | "AgentRegistry" | "RoboticsMarketplace";

export interface OpsContract {
  key: OpsContractKey;
  address: Address;
  /** Block of the creation transaction. Lower bound for log queries. */
  deployBlock: number;
}

export const OPS_CONTRACT_KEYS: readonly OpsContractKey[] = ["MockUSDG", "X402Facilitator", "AgentRegistry", "RoboticsMarketplace"];

/** Operator the facilitator owner approved to submit settlements (x402-server signer). */
export const OPS_SETTLER: Address = "0xd98aC3064B36dFb19b62558d48cB16f00105F473";

/** MockUSDG.decimals() is a pure 6. The contracts section reads it on chain as a check. */
export const MUSDG_DECIMALS = 6;
export const MUSDG_SYMBOL = "mUSDG";

const MOCK_USDG: Address = "0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4";
const X402_FACILITATOR: Address = "0xB7D6F2aC244C8562CEd113AAf1a1A41C253FE816";
const AGENT_REGISTRY: Address = "0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331";
const ROBOTICS_MARKETPLACE: Address = "0xFd6F3e01c60870a8978665fF2EE872861590bEc3";

export const OPS_DEPLOYMENTS: Readonly<Record<OpsChainId, Readonly<Record<OpsContractKey, OpsContract>>>> = {
  [opsArbitrumSepolia.id]: {
    MockUSDG: { key: "MockUSDG", address: MOCK_USDG, deployBlock: 314_673_947 },
    X402Facilitator: { key: "X402Facilitator", address: X402_FACILITATOR, deployBlock: 314_673_957 },
    AgentRegistry: { key: "AgentRegistry", address: AGENT_REGISTRY, deployBlock: 311_753_905 },
    RoboticsMarketplace: { key: "RoboticsMarketplace", address: ROBOTICS_MARKETPLACE, deployBlock: 311_753_912 },
  },
  [opsRobinhoodTestnet.id]: {
    MockUSDG: { key: "MockUSDG", address: MOCK_USDG, deployBlock: 127_186_862 },
    X402Facilitator: { key: "X402Facilitator", address: X402_FACILITATOR, deployBlock: 127_186_883 },
    AgentRegistry: { key: "AgentRegistry", address: AGENT_REGISTRY, deployBlock: 122_277_680 },
    RoboticsMarketplace: { key: "RoboticsMarketplace", address: ROBOTICS_MARKETPLACE, deployBlock: 122_277_694 },
  },
};

export function getOpsDeployment(chainId: OpsChainId): Readonly<Record<OpsContractKey, OpsContract>> {
  return OPS_DEPLOYMENTS[chainId];
}
