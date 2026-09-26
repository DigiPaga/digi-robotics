"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { useEffect, useRef } from "react";
import { arbitrumSepolia, embeddedWallets, thirdwebClient } from "@/lib/thirdweb";

function ThirdwebAuthContent({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const account = useActiveAccount();
  const notifiedAddress = useRef<string | null>(null);

  useEffect(() => {
    if (!account?.address || notifiedAddress.current === account.address) return;
    notifiedAddress.current = account.address;
    onLoginSuccess();
  }, [account?.address, onLoginSuccess]);

  return <>
    <ConnectButton
      client={thirdwebClient}
      chain={arbitrumSepolia}
      wallets={embeddedWallets}
      theme="dark"
      connectButton={{ label: "CONTINUE WITH GOOGLE OR EMAIL" }}
      connectModal={{ title: "DigiRobotics contributor access", size: "compact" }}
    />
    <p className="mt-4 font-mono text-[11px] uppercase tracking-[.12em] text-white/55">ZeroDev smart-account connection follows only after signer compatibility is confirmed.</p>
  </>;
}

export function ThirdwebAuthPanel({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  return <ThirdwebAuthContent onLoginSuccess={onLoginSuccess} />;
}
