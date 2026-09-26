import type { SignerCapability } from "./types";

export function canAdaptThirdwebAccount(
  account: SignerCapability | null | undefined,
): account is Required<SignerCapability> {
  return Boolean(account?.address && typeof account.signMessage === "function" && typeof account.signTypedData === "function");
}

export function describeSignerCompatibility(account: SignerCapability | null | undefined) {
  return canAdaptThirdwebAccount(account)
    ? { compatible: true as const, state: "OWNER SIGNER READY" }
    : { compatible: false as const, state: "WALLET INTEGRATION PENDING SETUP" };
}
