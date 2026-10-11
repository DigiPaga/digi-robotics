"use client";

import { AutoConnect } from "thirdweb/react";
import { embeddedWallets, isThirdwebConfigured, thirdwebClient } from "@/lib/thirdweb";

/**
 * Resolves the wallet connection status on pages that depend on it. thirdweb only leaves the
 * "unknown" state once something attempts an auto-connect, and the connect button lives inside
 * the sign-in modal, so a page that waits on the status without this would wait forever. It also
 * restores a previous embedded-wallet session after a reload.
 */
export function WalletAutoConnect() {
  if (!isThirdwebConfigured) return null;
  return <AutoConnect client={thirdwebClient} wallets={embeddedWallets} timeout={15000} />;
}
