"use client";

import { toast } from "sonner";

const TRANSACTION_TOAST_ID = "digirobotics-transaction-progress";

function shortPublicValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 16) return trimmed;
  return `${trimmed.slice(0, 8)}…${trimmed.slice(-6)}`;
}

export function showSuccess(message: string): string | number {
  return toast.success(message);
}

export function showError(message: string): string | number {
  return toast.error(message);
}

export function showInfo(message: string): string | number {
  return toast.info(message);
}

export function showWalletConnected(address: string): string | number {
  return toast.success("Wallet connected", {
    id: `wallet-${address.toLowerCase()}`,
    description: shortPublicValue(address),
  });
}

export function showTransactionPending(): string | number {
  return toast.loading("Waiting for wallet approval", {
    id: TRANSACTION_TOAST_ID,
    description: "Review the request in your wallet.",
    duration: Infinity,
  });
}

export function showTransactionSubmitted(hash: string): string | number {
  return toast.loading("Transaction submitted", {
    id: TRANSACTION_TOAST_ID,
    description: `${shortPublicValue(hash)} · waiting for confirmation`,
    duration: Infinity,
  });
}

export function showTransactionConfirmed(hash: string): string | number {
  return toast.success("Transaction confirmed", {
    id: TRANSACTION_TOAST_ID,
    description: shortPublicValue(hash),
  });
}

export function showCopySuccess(label = "Public value"): string | number {
  return toast.success(`${label} copied`, { duration: 2_500 });
}
