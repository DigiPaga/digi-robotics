import { createThirdwebClient } from "thirdweb";
import { arbitrumSepolia, robinhoodTestnet } from "./chains";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID?.trim() ?? "";

// See src/lib/thirdweb.ts: createThirdwebClient throws without a clientId or
// secretKey, which would crash any module that imports this one.
export const isThirdwebConfigured = Boolean(clientId);
export const client = createThirdwebClient({
  clientId: isThirdwebConfigured ? clientId : "unconfigured",
});

export const supportedChains = [arbitrumSepolia, robinhoodTestnet] as const;
export type SupportedChain = typeof supportedChains[number];
