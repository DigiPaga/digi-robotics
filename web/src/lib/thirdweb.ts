import { createThirdwebClient, defineChain } from "thirdweb";
import { inAppWallet } from "thirdweb/wallets/in-app";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID?.trim() ?? "";

export const thirdwebClient = createThirdwebClient({ clientId });
export const arbitrumSepolia = defineChain(421614);
export const embeddedWallets = [
  inAppWallet({ auth: { options: ["google", "email"] } }),
];
