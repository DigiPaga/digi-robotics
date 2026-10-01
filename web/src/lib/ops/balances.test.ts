// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOpsBalances, isLowBalance, MAX_OPS_WALLETS } from "./balances";
import { opsArbitrumSepolia, opsRobinhoodTestnet } from "./chains";

// Normalized, because fetch may be handed a Request whose URL gained a trailing slash.
const ARBITRUM_RPC = new URL(opsArbitrumSepolia.rpcUrls.default.http[0]).href;
const ROBINHOOD_RPC = new URL(opsRobinhoodTestnet.rpcUrls.default.http[0]).href;
const TOKEN = "0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4";
const BALANCE_OF = "0x70a08231";
const DECIMALS = "0x313ce567";

interface RpcCall {
  id: number;
  method: string;
  params: [unknown, ...unknown[]];
}
type RpcReply = { result: string } | { error: { code: number; message: string } };

function address(n: number): `0x${string}` {
  return `0x${n.toString(16).padStart(40, "0")}`;
}

function word(value: bigint): string {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function walletsEnv(count: number, extra: Record<string, string> = {}) {
  const wallets = Array.from({ length: count }, (_, i) => ({ label: `W${i + 1}`, address: address(i + 1), role: "", minEth: 0.01 }));
  return { OPS_WALLETS: JSON.stringify(wallets), ...extra };
}

/** Default node: wallet N holds N ETH and N mUSDG (6 decimals). */
function defaultReply(call: RpcCall): RpcReply {
  if (call.method === "eth_getBalance") return { result: word(BigInt(String(call.params[0])) * 10n ** 18n) };
  if (call.method === "eth_call") {
    const data = (call.params[0] as { data: string }).data;
    if (data.startsWith(DECIMALS)) return { result: word(6n) };
    if (data.startsWith(BALANCE_OF)) return { result: word(BigInt(`0x${data.slice(-40)}`) * 10n ** 6n) };
  }
  return { error: { code: -32601, message: "method not found" } };
}

/** Stubs fetch as a JSON-RPC node and records every HTTP request as the list of calls it carried. */
function stubRpc(reply: (url: string, call: RpcCall) => RpcReply | "network-error" = (_url, call) => defaultReply(call)) {
  const requests: { url: string; calls: RpcCall[] }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input)).href;
    const body = JSON.parse(String(init?.body ?? (input instanceof Request ? await input.text() : "null"))) as RpcCall | RpcCall[];
    const calls = Array.isArray(body) ? body : [body];
    requests.push({ url, calls });
    const replies = calls.map((call) => {
      const answer = reply(url, call);
      if (answer === "network-error") throw new TypeError("fetch failed");
      return { jsonrpc: "2.0", id: call.id, ...answer };
    });
    return Response.json(Array.isArray(body) ? replies : replies[0]);
  }));
  return requests;
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchOpsBalances", () => {
  it("reads every wallet with a single batched request per chain", async () => {
    const requests = stubRpc();
    const snapshot = await fetchOpsBalances(walletsEnv(3, { NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA: TOKEN }));

    expect(requests).toHaveLength(2);
    expect(requests.map((request) => request.url).sort()).toEqual([ROBINHOOD_RPC, ARBITRUM_RPC].sort());
    const arbitrum = requests.find((request) => request.url === ARBITRUM_RPC)!.calls;
    const robinhood = requests.find((request) => request.url === ROBINHOOD_RPC)!.calls;
    // 3 ETH balances + 3 balanceOf + decimals once (not once per wallet).
    expect(arbitrum).toHaveLength(7);
    expect(arbitrum.filter((call) => call.method === "eth_call" && (call.params[0] as { data: string }).data.startsWith(DECIMALS))).toHaveLength(1);
    // No token configured on this chain: balances only.
    expect(robinhood.map((call) => call.method)).toEqual(["eth_getBalance", "eth_getBalance", "eth_getBalance"]);

    expect(snapshot.warning).toBeNull();
    expect(snapshot.rows.map((row) => row.wallet.label)).toEqual(["W1", "W2", "W3"]);
    expect(snapshot.rows[1].cells).toEqual([
      { chainId: opsArbitrumSepolia.id, ethWei: (2n * 10n ** 18n).toString(), eth: "2", low: false, musdg: "2", error: null },
      { chainId: opsRobinhoodTestnet.id, ethWei: (2n * 10n ** 18n).toString(), eth: "2", low: false, musdg: null, error: null },
    ]);
  });

  it("caps the snapshot at MAX_OPS_WALLETS and says so", async () => {
    const requests = stubRpc();
    const snapshot = await fetchOpsBalances(walletsEnv(14));
    expect(MAX_OPS_WALLETS).toBe(10);
    expect(snapshot.rows).toHaveLength(10);
    expect(snapshot.rows.at(-1)?.wallet.label).toBe("W10");
    expect(snapshot.warning).toBe("Showing the first 10 of 14 configured wallets.");
    expect(requests).toHaveLength(2);
    for (const request of requests) expect(request.calls).toHaveLength(10);
  });

  it("counts the treasury row against the cap", async () => {
    stubRpc();
    const snapshot = await fetchOpsBalances(walletsEnv(10, { X402_PAY_TO: address(99) }));
    expect(snapshot.rows).toHaveLength(10);
    expect(snapshot.warning).toBe("Showing the first 10 of 11 configured wallets.");
  });

  it("isolates a failing call to its own cell inside a batch", async () => {
    stubRpc((_url, call) => {
      const target = call.method === "eth_getBalance" ? String(call.params[0]) : (call.params[0] as { data: string }).data.slice(-40);
      const isWallet2 = BigInt(target.startsWith("0x") ? target : `0x${target}`) === 2n;
      if (call.method === "eth_getBalance" && isWallet2) return { error: { code: -32602, message: "invalid params" } };
      return defaultReply(call);
    });
    const tokens = { NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA: TOKEN, NEXT_PUBLIC_MOCK_USDG_ADDRESS_ROBINHOOD: TOKEN };
    const { rows } = await fetchOpsBalances(walletsEnv(3, tokens));
    for (const cell of rows[1].cells) {
      expect(cell).toMatchObject({ eth: null, ethWei: null, low: false, error: "RPC unavailable", musdg: "2" });
    }
    for (const row of [rows[0], rows[2]]) {
      for (const cell of row.cells) expect(cell.error).toBeNull();
    }
    expect(rows[2].cells[0]).toMatchObject({ eth: "3", musdg: "3" });
  });

  it("reports a failed token read without losing the ETH balance", async () => {
    stubRpc((_url, call) => {
      if (call.method === "eth_call" && (call.params[0] as { data: string }).data.startsWith(DECIMALS)) return { error: { code: 3, message: "execution reverted" } };
      return defaultReply(call);
    });
    const { rows } = await fetchOpsBalances(walletsEnv(2, { NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA: TOKEN }));
    expect(rows[0].cells[0]).toMatchObject({ eth: "1", musdg: null, error: "mUSDG read failed" });
    expect(rows[0].cells[1]).toMatchObject({ eth: "1", musdg: null, error: null });
  });

  it("keeps one chain's outage away from the other chain", async () => {
    stubRpc((url, call) => (url === ROBINHOOD_RPC ? "network-error" : defaultReply(call)));
    const { rows } = await fetchOpsBalances(walletsEnv(2));
    for (const row of rows) {
      expect(row.cells[0]).toMatchObject({ chainId: opsArbitrumSepolia.id, error: null });
      expect(row.cells[0].eth).not.toBeNull();
      expect(row.cells[1]).toMatchObject({ chainId: opsRobinhoodTestnet.id, eth: null, error: "RPC unavailable" });
    }
  });
});

describe("isLowBalance", () => {
  it("flags balances under the threshold and ignores a zero threshold", () => {
    expect(isLowBalance(10n ** 15n, 0.01)).toBe(true);
    expect(isLowBalance(10n ** 16n, 0.01)).toBe(false);
    expect(isLowBalance(0n, 0)).toBe(false);
  });
});
