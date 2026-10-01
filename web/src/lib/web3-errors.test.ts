import { describe, expect, it } from "vitest";
import { encodeErrorResult, parseAbi } from "viem";
import { FAUCET_COOLDOWN_SELECTOR, faucetCooldownAvailableAt, normalizeWeb3Error } from "./web3-errors";

describe("normalizeWeb3Error", () => {
  it("maps a user-rejected wallet connection by rejectionKind", () => {
    const result = normalizeWeb3Error(new Error("User rejected the request"), { rejectionKind: "wallet" });
    expect(result.code).toBe("USER_REJECTED_WALLET");
    expect(result.retryable).toBe(true);
  });

  it("maps a user-rejected signature by default rejectionKind", () => {
    const result = normalizeWeb3Error({ code: 4001, message: "rejected" });
    expect(result.code).toBe("USER_REJECTED_SIGNATURE");
  });

  it("maps a MetaMask-style ACTION_REJECTED code", () => {
    const result = normalizeWeb3Error({ code: "ACTION_REJECTED" });
    expect(result.code).toBe("USER_REJECTED_SIGNATURE");
  });

  it("maps an insufficient asset balance error and includes the asset symbol", () => {
    const result = normalizeWeb3Error(new Error("insufficient token balance for transfer"), { assetSymbol: "mUSDG" });
    expect(result.code).toBe("INSUFFICIENT_ASSET_BALANCE");
    expect(result.message).toContain("mUSDG");
  });

  it("falls back to the default asset label when none is provided", () => {
    const result = normalizeWeb3Error(new Error("insufficient balance of usdg token"));
    expect(result.message).toContain("USDG-compatible test asset");
  });

  it("maps an insufficient gas error", () => {
    const result = normalizeWeb3Error(new Error("insufficient funds for gas * price + value"));
    expect(result.code).toBe("INSUFFICIENT_GAS");
  });

  it("maps a wrong-network error and appends the expected network", () => {
    const result = normalizeWeb3Error(new Error("chain mismatch"), { expectedNetwork: "Arbitrum Sepolia" });
    expect(result.code).toBe("WRONG_NETWORK");
    expect(result.message).toContain("Switch to Arbitrum Sepolia");
  });

  it("maps a wrong-network error without a suffix when no network is given", () => {
    const result = normalizeWeb3Error(new Error("wrong network"));
    expect(result.code).toBe("WRONG_NETWORK");
    expect(result.message).toContain("Switch to the network required for this action.");
  });

  it("maps an unsupported chain error", () => {
    const result = normalizeWeb3Error(new Error("unsupported chain"), { expectedNetwork: "Arbitrum Sepolia" });
    expect(result.code).toBe("UNSUPPORTED_CHAIN");
    expect(result.retryable).toBe(false);
  });

  it("maps a wallet-not-connected error", () => {
    const result = normalizeWeb3Error(new Error("connect a wallet first"));
    expect(result.code).toBe("WALLET_NOT_CONNECTED");
  });

  it("maps a smart-account initialization failure", () => {
    const result = normalizeWeb3Error(new Error("zerodev is not configured for this chain"));
    expect(result.code).toBe("SMART_ACCOUNT_INITIALIZATION_FAILED");
  });

  it("maps a timeout error by name", () => {
    const result = normalizeWeb3Error({ name: "TimeoutError", message: "slow" });
    expect(result.code).toBe("REQUEST_TIMEOUT");
  });

  it("maps a network/rpc error", () => {
    const result = normalizeWeb3Error(new Error("failed to fetch"));
    expect(result.code).toBe("RPC_UNAVAILABLE");
  });

  it("maps a reverted transaction by error name", () => {
    const result = normalizeWeb3Error({ name: "ContractFunctionRevertedError", message: "revert" });
    expect(result.code).toBe("TRANSACTION_REVERTED");
  });

  it("maps a receipt failure", () => {
    const result = normalizeWeb3Error(new Error("transaction receipt failed"));
    expect(result.code).toBe("RECEIPT_FAILED");
    expect(result.retryable).toBe(false);
  });

  it("maps an x402 policy rejection", () => {
    const result = normalizeWeb3Error(new Error("payment rejected by policy"));
    expect(result.code).toBe("X402_PAYMENT_REJECTED");
  });

  it("maps an x402 settlement failure", () => {
    const result = normalizeWeb3Error(new Error("settlement failed"));
    expect(result.code).toBe("X402_SETTLEMENT_FAILED");
  });

  it("maps a locked protected resource", () => {
    const result = normalizeWeb3Error(new Error("content remains locked"));
    expect(result.code).toBe("PROTECTED_RESOURCE_LOCKED");
  });

  it("falls back to UNKNOWN for an unrecognized cause and stays retryable", () => {
    const result = normalizeWeb3Error(new Error("something bizarre happened"));
    expect(result.code).toBe("UNKNOWN");
    expect(result.retryable).toBe(true);
  });

  it("walks a cause chain to find a matching signal", () => {
    const inner = new Error("user rejected the request");
    const outer = new Error("request failed", { cause: inner });
    const result = normalizeWeb3Error(outer);
    expect(result.code).toBe("USER_REJECTED_SIGNATURE");
  });

  it("does not loop forever on a circular cause chain", () => {
    const circular: { message: string; cause?: unknown } = { message: "loopy" };
    circular.cause = circular;
    expect(() => normalizeWeb3Error(circular)).not.toThrow();
    expect(normalizeWeb3Error(circular).code).toBe("UNKNOWN");
  });

  it("handles a plain string cause", () => {
    const result = normalizeWeb3Error("user rejected the request");
    expect(result.code).toBe("USER_REJECTED_SIGNATURE");
  });

  it("handles a nullish cause without throwing", () => {
    expect(() => normalizeWeb3Error(undefined)).not.toThrow();
    expect(normalizeWeb3Error(null).code).toBe("UNKNOWN");
  });

  it("preserves the original error on the normalized result", () => {
    const original = new Error("boom");
    const result = normalizeWeb3Error(original);
    expect(result.original).toBe(original);
  });
});

describe("FaucetCooldownActive", () => {
  const availableAtSeconds = BigInt(1_760_086_400);
  const availableAt = new Date(Number(availableAtSeconds) * 1_000);
  const revertData = encodeErrorResult({
    abi: parseAbi(["error FaucetCooldownActive(uint256 availableAt)"]),
    errorName: "FaucetCooldownActive",
    args: [availableAtSeconds],
  });
  const expectedTime = availableAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  it("uses the selector of MockUSDG's custom error", () => {
    expect(FAUCET_COOLDOWN_SELECTOR).toBe(revertData.slice(0, 10));
  });

  it("decodes raw revert data nested in a sponsored smart-account failure", () => {
    const bundlerError = new Error(`UserOperation reverted during simulation with reason: ${revertData}`);
    const wrapped = Object.assign(new Error("The sponsored smart-account transaction could not be completed.", { cause: bundlerError }), {
      code: "SMART_ACCOUNT_TRANSACTION_FAILED",
    });
    const result = normalizeWeb3Error(wrapped, { operation: "checkout" });
    expect(result.code).toBe("FAUCET_COOLDOWN_ACTIVE");
    expect(result.retryable).toBe(false);
    expect(result.availableAt).toEqual(availableAt);
    expect(result.message).toBe(`This wallet already used the demo faucet in the last 24 hours. Next request available ${expectedTime}.`);
  });

  it("decodes revert data from a viem-style data field", () => {
    expect(faucetCooldownAvailableAt({ shortMessage: "execution reverted", data: revertData })).toEqual(availableAt);
    expect(faucetCooldownAvailableAt({ message: "reverted", data: { data: revertData } })).toEqual(availableAt);
  });

  it("uses availableAt from the faucet pre-flight error", () => {
    const preflight = Object.assign(new Error("The demo faucet cooldown is still active for this wallet."), { code: "FAUCET_COOLDOWN_ACTIVE", availableAt });
    expect(normalizeWeb3Error(preflight).availableAt).toEqual(availableAt);
  });

  it("does not misread other reverts", () => {
    expect(faucetCooldownAvailableAt(new Error("execution reverted: 0x08c379a0"))).toBeUndefined();
    expect(normalizeWeb3Error(new Error("execution reverted")).code).toBe("TRANSACTION_REVERTED");
  });
});
