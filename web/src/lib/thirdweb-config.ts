import { createThirdwebClient } from "thirdweb";
import { arbitrumSepolia, robinhoodTestnet } from "./chains";

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
});

export const supportedChains = [arbitrumSepolia, robinhoodTestnet] as const;
export type SupportedChain = typeof supportedChains[number];
