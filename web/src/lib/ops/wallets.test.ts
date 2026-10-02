import { describe, expect, it } from "vitest";
import { isLowBalance } from "./balances";
import { DEFAULT_MIN_ETH, DEFAULT_OPS_WALLETS, parseOpsWallets, readMusdgTokens, readOpsWallets } from "./wallets";

describe("OPS_WALLETS parsing", () => {
  it("uses the deployer and settler defaults when unset", () => {
    const { wallets, warning } = parseOpsWallets(undefined);
    expect(warning).toBeNull();
    expect(wallets.map((wallet) => wallet.address)).toEqual([
      "0x962B67f92E9BAfc3A584fe2EA3ad871AcA3509d6",
      "0xd98aC3064B36dFb19b62558d48cB16f00105F473",
    ]);
    expect(wallets.map((wallet) => wallet.minEth)).toEqual([0.0005, 0.0005]);
    expect(DEFAULT_MIN_ETH).toBe(0.0005);
  });

  it("keeps the default threshold testnet-sane", () => {
    // A testnet deploy costs about 0.0002 ETH: a wallet holding a few deploys is not Low, a nearly empty one is.
    expect(isLowBalance(10n ** 15n, DEFAULT_MIN_ETH)).toBe(false); // 0.001 ETH
    expect(isLowBalance(2n * 10n ** 14n, DEFAULT_MIN_ETH)).toBe(true); // 0.0002 ETH
  });

  it("parses, checksums and dedupes a custom list", () => {
    const raw = JSON.stringify([
      { label: "Ops", address: "0xd98ac3064b36dfb19b62558d48cb16f00105f473", role: "settler", minEth: "0.02" },
      { label: "Dup", address: "0xD98AC3064B36DFB19B62558D48CB16F00105F473" },
    ]);
    const { wallets, warning } = parseOpsWallets(raw);
    expect(warning).toBeNull();
    expect(wallets).toEqual([{ label: "Ops", address: "0xd98aC3064B36dFb19b62558d48cB16f00105F473", role: "settler", minEth: 0.02 }]);
  });

  it("falls back to defaults with a warning on bad JSON or bad entries", () => {
    for (const raw of ["{not json", "[]", JSON.stringify([{ label: "x", address: "0x123" }]), JSON.stringify([{ label: "x", address: DEFAULT_OPS_WALLETS[0].address, minEth: -1 }])]) {
      const result = parseOpsWallets(raw);
      expect(result.wallets).toEqual(DEFAULT_OPS_WALLETS);
      expect(result.warning).toMatch(/OPS_WALLETS/);
    }
  });

  it("adds the X402_PAY_TO treasury once, without an ETH threshold", () => {
    const treasury = "0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331";
    const { wallets } = readOpsWallets({ X402_PAY_TO: treasury.toLowerCase() });
    expect(wallets.at(-1)).toMatchObject({ label: "Treasury", address: treasury, minEth: 0 });
    expect(readOpsWallets({ X402_PAY_TO: DEFAULT_OPS_WALLETS[0].address }).wallets).toHaveLength(2);
    expect(readOpsWallets({ X402_PAY_TO: "garbage" }).wallets).toHaveLength(2);
  });

  it("reads mUSDG token addresses per chain with the checkout fallbacks", () => {
    const token = "0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331";
    expect(readMusdgTokens({})).toEqual({ 421614: null, 46630: null });
    expect(readMusdgTokens({ NEXT_PUBLIC_MOCK_USDG_ADDRESS: token })[421614]).toBe(token);
    expect(readMusdgTokens({ NEXT_PUBLIC_MOCK_USDG_ADDRESS_ROBINHOOD: token })[46630]).toBe(token);
    expect(readMusdgTokens({ NEXT_PUBLIC_MOCK_USDG_ADDRESS_ROBINHOOD: "0x0000000000000000000000000000000000000000" })[46630]).toBeNull();
  });
});
