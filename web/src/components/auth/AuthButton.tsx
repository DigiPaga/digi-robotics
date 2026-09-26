"use client";

import type { ButtonHTMLAttributes } from "react";
import { useAuthFlow } from "./AuthFlowProvider";

export function AuthButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const open = useAuthFlow();
  return <button type="button" onClick={open} className={className} {...props}>{children}</button>;
}
