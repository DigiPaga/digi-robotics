"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      closeButton
      richColors={false}
      visibleToasts={4}
      gap={10}
      offset={20}
      mobileOffset={12}
      containerAriaLabel="DigiRobotics notifications"
      toastOptions={{
        duration: 5_000,
        style: {
          background: "#161c29",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#ffffff",
          boxShadow: "0 22px 60px -28px rgba(0,0,0,0.9)",
        },
        classNames: {
          toast: "!w-[min(380px,calc(100vw-24px))] !rounded-2xl !px-4 !py-3",
          title: "!font-[var(--font-body)] !text-sm !font-semibold !leading-5",
          description: "!font-[var(--font-mono)] !text-[11px] !leading-5 !text-[#b8bcc6]",
          success: "!border-l-2 !border-l-[#84cc16]",
          error: "!border-l-2 !border-l-[#ff6b5e]",
          info: "!border-l-2 !border-l-[#8bbcff]",
          loading: "!border-l-2 !border-l-[#84cc16]",
          closeButton: "!border-white/15 !bg-[#0e1118] !text-white hover:!border-[#84cc16]",
        },
      }}
    />
  );
}
