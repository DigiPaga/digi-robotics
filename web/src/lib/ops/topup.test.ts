import { describe, expect, it, vi } from "vitest";
import { parseEther } from "viem";
import { addChainParams, assertTopUpChain, opsRobinhoodTestnet } from "./chains";
import { describeTopUpError, ensureTopUpChain, parseTopUpAmount, type Eip1193Provider } from "./topup";

function mockProvider(initialChain: number, opts: { knows?: number[]; switchError?: unknown } = {}) {
  let chainId = initialChain;
  const known = new Set(opts.knows ?? [initialChain]);
  const request = vi.fn(async ({ method, params }: { method: string; params?: unknown }) => {
    const arg = Array.isArray(params) ? (params[0] as { chainId: string }) : undefined;
    if (method === "eth_chainId") return `0x${chainId.toString(16)}`;
    if (method === "wallet_switchEthereumChain") {
      if (opts.switchError) throw opts.switchError;
      const next = Number.parseInt(arg!.chainId, 16);
      if (!known.has(next)) throw Object.assign(new Error("Unrecognized chain ID"), { code: 4902 });
      chainId = next;
      return null;
    }
    if (method === "wallet_addEthereumChain") {
      const next = Number.parseInt(arg!.chainId, 16);
      known.add(next);
      chainId = next;
      return null;
    }
    throw new Error(`unexpected ${method}`);
  });
  return { provider: { request } as Eip1193Provider, request };
}

describe("top-up chain guard", () => {
  it("allows only Arbitrum Sepolia and Robinhood Chain Testnet", () => {
    expect(assertTopUpChain(421614).id).toBe(421614);
    expect(assertTopUpChain(46630).id).toBe(46630);
    for (const id of [1, 42161, 8453, 84532, 11155111, 0]) expect(() => assertTopUpChain(id)).toThrow(/not an allowed top-up network/);
  });

  it("builds full Robinhood wallet_addEthereumChain params", () => {
    expect(addChainParams(opsRobinhoodTestnet)).toEqual({
      chainId: "0xb626",
      chainName: "Robinhood Chain Testnet",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://rpc.testnet.chain.robinhood.com"],
      blockExplorerUrls: ["https://explorer.testnet.chain.robinhood.com"],
    });
  });

  it("does nothing when the wallet is already on the target chain", async () => {
    const { provider, request } = mockProvider(421614);
    await expect(ensureTopUpChain(provider, 421614)).resolves.toMatchObject({ id: 421614 });
    expect(request.mock.calls.map(([call]) => call.method)).toEqual(["eth_chainId", "eth_chainId"]);
  });

  it("switches, and adds the chain on 4902", async () => {
    const { provider, request } = mockProvider(1, { knows: [1, 421614] });
    await ensureTopUpChain(provider, 421614);
    expect(request.mock.calls.map(([call]) => call.method)).toContain("wallet_switchEthereumChain");
    const robinhood = mockProvider(421614);
    await ensureTopUpChain(robinhood.provider, 46630);
    const methods = robinhood.request.mock.calls.map(([call]) => call.method);
    expect(methods).toContain("wallet_addEthereumChain");
  });

  it("refuses disallowed chains before talking to the wallet", async () => {
    const { provider, request } = mockProvider(1);
    await expect(ensureTopUpChain(provider, 1)).rejects.toThrow(/not an allowed/);
    expect(request).not.toHaveBeenCalled();
  });

  it("fails if the wallet silently stays on the wrong chain", async () => {
    const stubborn: Eip1193Provider = {
      request: async ({ method }) => (method === "eth_chainId" ? "0x1" : null),
    };
    await expect(ensureTopUpChain(stubborn, 421614)).rejects.toThrow(/Wrong network/);
  });

  it("propagates a user rejection of the switch", async () => {
    const { provider } = mockProvider(1, { switchError: Object.assign(new Error("User rejected the request."), { code: 4001 }) });
    await expect(ensureTopUpChain(provider, 421614)).rejects.toMatchObject({ code: 4001 });
  });
});

describe("top-up amount and errors", () => {
  it("parses valid amounts and rejects bad ones", () => {
    expect(parseTopUpAmount("0.005")).toBe(parseEther("0.005"));
    expect(parseTopUpAmount(" .01 ")).toBe(parseEther("0.01"));
    expect(parseTopUpAmount("0.5")).toBe(parseEther("0.5"));
    expect(() => parseTopUpAmount("0.")).toThrow(/greater than zero/);
    expect(() => parseTopUpAmount("0")).toThrow(/greater than zero/);
    expect(() => parseTopUpAmount("-1")).toThrow();
    expect(() => parseTopUpAmount("abc")).toThrow();
    expect(() => parseTopUpAmount("1e3")).toThrow();
    expect(() => parseTopUpAmount("5")).toThrow(/capped/);
  });

  it("maps wallet errors to clear messages", () => {
    expect(describeTopUpError(Object.assign(new Error("x"), { code: 4001 }))).toMatch(/rejected/);
    expect(describeTopUpError({ shortMessage: "x", cause: { code: 4001 } })).toMatch(/rejected/);
    expect(describeTopUpError(new Error("insufficient funds for gas * price + value"))).toMatch(/enough ETH/);
    expect(describeTopUpError(new Error("Wrong network: wallet is on chain 1"))).toMatch(/wrong network/);
    expect(describeTopUpError(Object.assign(new Error("x"), { code: 4902 }))).toMatch(/does not know this network/);
  });
});
