"use client";

import { createThirdwebClient, defineChain } from "thirdweb";
import { ConnectButton, ThirdwebProvider } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets/in-app";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID?.trim() ?? "";
const rawChainId = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();
const client = createThirdwebClient({ clientId });
const chainId = rawChainId ? Number(rawChainId) : null;

export function ThirdwebAuthPanel() {
  return (
    <ThirdwebProvider>
      <ConnectButton
        client={client}
        chain={chainId ? defineChain(chainId) : undefined}
        wallets={[inAppWallet({ auth: { options: ["google", "email"] } })]}
        theme="dark"
        connectButton={{ label: "CONTINUE WITH GOOGLE OR EMAIL" }}
        connectModal={{ title: "DigiRobotics contributor access", size: "compact" }}
      />
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[.12em] text-white/55">ZeroDev smart-account connection follows only after signer compatibility is confirmed.</p>
    </ThirdwebProvider>
  );
}
