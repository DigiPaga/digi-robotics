import { agentRegistry } from "./agentRegistry";
import { marketplace } from "./marketplace";
import { usdc } from "./usdc";

export { agentRegistry, marketplace, usdc };

export const contractAddresses = {
  arbitrumSepolia: {
    usdc: "0x75faF114eAfb1bDbE4F43213fE49d7C47Aa714b3",
    agentRegistry: process.env.AGENT_REGISTRY_ADDRESS || "",
    marketplace: process.env.MARKETPLACE_ADDRESS || "",
  },
  robinhoodTestnet: {
    usdc: process.env.ROBINHOOD_USDC_ADDRESS || "",
    agentRegistry: process.env.RH_AGENT_REGISTRY_ADDRESS || "",
    marketplace: process.env.RH_MARKETPLACE_ADDRESS || "",
  },
} as const;

export default {
  agentRegistry,
  marketplace,
  usdc,
};
