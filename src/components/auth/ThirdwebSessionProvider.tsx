"use client";

import type { ReactNode } from "react";
import { ThirdwebProvider } from "thirdweb/react";

export function ThirdwebSessionProvider({ children }: { children: ReactNode }) {
  return <ThirdwebProvider>{children}</ThirdwebProvider>;
}
