import { createThirdwebClient, defineChain } from "thirdweb";
import { inAppWallet } from "thirdweb/wallets/in-app";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID?.trim() ?? "";

// createThirdwebClient throws synchronously if given neither a clientId nor a
// secretKey, which crashes any page that imports this module as soon as
// NEXT_PUBLIC_THIRDWEB_CLIENT_ID is unset. Fall back to a placeholder id so the
// module always loads; callers must check isThirdwebConfigured before relying on
// any wallet/auth feature.
export const isThirdwebConfigured = Boolean(clientId);
export const thirdwebClient = createThirdwebClient({ clientId: isThirdwebConfigured ? clientId : "unconfigured" });
export const arbitrumSepolia = defineChain(421614);
export const embeddedWallets = [
  inAppWallet({ auth: { options: ["google", "email"] } }),
];
