import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpsBalancesSnapshot } from "@/lib/ops/balances";
import { clearOpsDataCache } from "@/lib/ops/client/use-ops-data";
import type { ContractsSnapshot } from "@/lib/ops/contracts";
import type { InfraSnapshot } from "@/lib/ops/infra";
import type { MarketplaceSnapshot } from "@/lib/ops/marketplace";
import type { OverviewSnapshot } from "@/lib/ops/overview";
import type { PaymentsSnapshot } from "@/lib/ops/payments";
import { ContractsSection } from "./ContractsSection";
import { InfraSection } from "./InfraSection";
import { MarketplaceSection } from "./MarketplaceSection";
import { OverviewSection } from "./OverviewSection";
import { PaymentsSection } from "./PaymentsSection";
import { ContractsSkeleton, InfraSkeleton, MarketplaceSkeleton, OverviewSkeleton, PaymentsSkeleton, WalletsSkeleton } from "./skeletons";
import { WalletsSection } from "./WalletsSection";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean; children: ReactNode }) => <a href={href} className={className}>{children}</a>,
}));

const ARB = "https://sepolia.arbiscan.io";
const RH = "https://explorer.testnet.chain.robinhood.com";
const DEPLOYER = "0x962B67f92E9BAfc3A584fe2EA3ad871AcA3509d6";
const SETTLER = "0xd98aC3064B36dFb19b62558d48cB16f00105F473";
const PAYER = "0xF16f0871811A545214f9f39EC6a8Ac84FdbA9fe3";
const TOKEN = "0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4";
const FACILITATOR = "0xB7D6F2aC244C8562CEd113AAf1a1A41C253FE816";
const ARB_TX = "0xd2d5a3851db8723f65c1c441d3fa83f468443f6860b1a1ab82efe002dd521d89";
const RH_TX = "0x73f27e20114467706967ae30ff3c034a34214cb5be432af4759985c861f3fc6b";

const overview: OverviewSnapshot = {
  refreshedAt: "2026-10-01T16:00:00.000Z",
  counts: { ok: 1, warn: 1, bad: 1, unknown: 0 },
  checks: [
    { id: "wallets", label: "Wallets", status: "bad", summary: "1 balance below minimum", detail: "Settler on Arbitrum Sepolia: 0.001 ETH, minimum 0.005", at: null, href: "/ops/wallets", external: null },
    { id: "x402", label: "x402 server", status: "warn", summary: "Up, mode BLOCKED", detail: null, at: null, href: "/ops/infra", external: null },
    { id: "settlement-421614", label: "Last settlement, Arbitrum Sepolia", status: "ok", summary: "0.05 mUSDG", detail: "1 payment, 0.05 mUSDG in total.", at: "2026-10-01T15:00:00.000Z", href: "/ops/payments", external: { label: "Transaction", url: `${ARB}/tx/${ARB_TX}` } },
  ],
};

const cell = (chainId: number, eth: string, low: boolean, musdg: string) => ({ chainId, ethWei: "1", eth, low, musdg, error: null });
const balances: OpsBalancesSnapshot = {
  refreshedAt: "2026-10-01T16:00:00.000Z",
  warning: null,
  chains: [{ id: 421614, name: "Arbitrum Sepolia", explorer: ARB, musdgToken: TOKEN }, { id: 46630, name: "Robinhood Chain Testnet", explorer: RH, musdgToken: TOKEN }],
  rows: [
    { wallet: { label: "Deployer", address: DEPLOYER, role: "Owner / deployer", minEth: 0.01 }, cells: [cell(421614, "0.25", false, "999.05"), cell(46630, "0.3", false, "999.05")] },
    { wallet: { label: "Settler", address: SETTLER, role: "x402 settler", minEth: 0.005 }, cells: [cell(421614, "0.001", true, "0"), cell(46630, "0.02", false, "0")] },
  ],
};

const paymentRow = (chainId: number, txHash: `0x${string}`, kind: "settled" | "mint", timestamp: string) => ({
  chainId, kind, txHash, logIndex: 7, blockNumber: 314674503, timestamp,
  from: kind === "mint" ? "0x0000000000000000000000000000000000000000" as const : PAYER as `0x${string}`, to: DEPLOYER as `0x${string}`,
  amountAtomic: kind === "mint" ? "1000000000" : "50000", amount: kind === "mint" ? "1000" : "0.05",
  resourceId: kind === "settled" ? "0x736767f72798068d29c6ebd9c565e7deed110d0df651a21ad8812272d7d47f4d" as const : null,
  nonce: null, settler: kind === "settled" ? SETTLER as `0x${string}` : null,
});
const chainTotals = { payments: 1, settled: 1, volumeAtomic: "50000", volume: "0.05", uniquePayers: 1, otherTransfers: 1 };
const payments: PaymentsSnapshot = {
  refreshedAt: "2026-10-01T16:00:00.000Z",
  token: { symbol: "mUSDG", decimals: 6 },
  totals: { payments: 2, settled: 2, volumeAtomic: "100000", volume: "0.1", uniquePayers: 1, otherTransfers: 1 },
  chains: [
    { chainId: 421614, name: "Arbitrum Sepolia", explorer: ARB, ok: true, error: null, range: { fromBlock: 314673947, toBlock: 314693208, truncated: false }, totals: chainTotals, lastSettlement: null, rowCount: 2,
      rows: [paymentRow(421614, ARB_TX, "settled", "2026-10-01T15:00:00.000Z"), paymentRow(421614, "0xd98c1a12000000000000000000000000000000000000000000000000000be0cb", "mint", "2026-10-01T14:00:00.000Z")] },
    { chainId: 46630, name: "Robinhood Chain Testnet", explorer: RH, ok: true, error: null, range: { fromBlock: 127186862, toBlock: 127214827, truncated: false }, totals: chainTotals, lastSettlement: null, rowCount: 1,
      rows: [paymentRow(46630, RH_TX, "settled", "2026-10-01T15:00:10.000Z")] },
  ],
};

const plain = (key: "AgentRegistry" | "RoboticsMarketplace", address: `0x${string}`) => ({ key, address, deployBlock: 311753905, codePresent: true, owner: { status: "absent" as const }, paused: { status: "absent" as const }, token: null, facilitator: null });
const chainContracts = (chainId: number, name: string, explorer: string, settlerApproved: boolean) => ({
  chainId, name, explorer, reachable: true,
  contracts: [
    { key: "MockUSDG" as const, address: TOKEN as `0x${string}`, deployBlock: 314673947, codePresent: true, owner: { status: "absent" as const }, paused: { status: "absent" as const }, facilitator: null,
      token: { name: { status: "ok" as const, value: "Mock USDG (Demo)" }, symbol: { status: "ok" as const, value: "mUSDG" }, version: { status: "ok" as const, value: "1" }, decimals: { status: "ok" as const, value: 6 }, decimalsMatch: true } },
    { key: "X402Facilitator" as const, address: FACILITATOR as `0x${string}`, deployBlock: 314673957, codePresent: true, owner: { status: "ok" as const, value: DEPLOYER as `0x${string}` }, paused: { status: "absent" as const }, token: null,
      facilitator: { token: { status: "ok" as const, value: TOKEN as `0x${string}` }, tokenMatches: true, settler: SETTLER as `0x${string}`, settlerApproved: { status: "ok" as const, value: settlerApproved }, pendingOwner: { status: "absent" as const } } },
    plain("AgentRegistry", "0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331"),
    plain("RoboticsMarketplace", "0xFd6F3e01c60870a8978665fF2EE872861590bEc3"),
  ],
});
const contracts: ContractsSnapshot = {
  refreshedAt: "2026-10-01T16:00:00.000Z",
  settler: SETTLER,
  chains: [chainContracts(421614, "Arbitrum Sepolia", ARB, true), chainContracts(46630, "Robinhood Chain Testnet", RH, false)],
};

const x402 = { state: "ok" as const, origin: "https://x402.example.test", mode: "REAL_MUSDG_X402", latencyMs: 41, httpStatus: 200 };
const marketplace: MarketplaceSnapshot = {
  refreshedAt: "2026-10-01T16:00:00.000Z",
  x402,
  catalog: { state: "ok", origin: "https://x402.example.test", datasets: [{ id: "kitchen-cooking-pov", title: "Kitchen Cooking POV", description: "First-person utensil trajectories.", tags: ["robotics"], priceDisplay: "0.05 mUSDG", network: "eip155:421614", assetSymbol: "mUSDG", assetAddress: TOKEN, sellerAddress: DEPLOYER }] },
  gear: { total: 30, priced: 5, categories: [{ name: "Recording Devices", count: 8 }, { name: "Software & Processing", count: 2 }] },
  orders: { state: "ok", count: 3, latestAt: "2026-10-01T12:00:00.000Z" },
};

const infra: InfraSnapshot = {
  refreshedAt: "2026-10-01T16:00:00.000Z",
  rpc: [
    { chainId: 421614, name: "Arbitrum Sepolia", host: "sepolia-rollup.arbitrum.io", ok: true, latencyMs: 101, blockNumber: 314693208, blockTime: "2026-10-01T16:00:00.000Z", blockAgeSeconds: 2, chainIdMatches: true },
    { chainId: 46630, name: "Robinhood Chain Testnet", host: "rpc.testnet.chain.robinhood.com", ok: false, latencyMs: null, blockNumber: null, blockTime: null, blockAgeSeconds: null, chainIdMatches: null },
  ],
  x402,
  build: { commit: "d362ad3561850360abba2459f4ee38d7b0ddf53d", commitSource: "NEXT_PUBLIC_COMMIT_SHA", builtAt: "2026-10-01T15:30:00.000Z", runtime: "Node.js 22", nodeEnv: "production" },
  ci: {
    state: "ok", repo: "DigiPaga/digi-robotics", branch: "main", fetchedAt: "2026-10-01T16:00:00.000Z", rateLimitResetAt: null, latest: null,
    runs: [{ id: 1, workflow: "CI", status: "completed", conclusion: "success", sha: "d362ad3561850360abba2459f4ee38d7b0ddf53d", title: "Merge pull request #9", event: "push", createdAt: "2026-10-01T16:21:25Z", updatedAt: "2026-10-01T16:24:02Z", url: "https://github.com/DigiPaga/digi-robotics/actions/runs/1" }],
  },
  config: {
    items: [{ name: "X402_SERVER_URL", set: true, purpose: "x402 server for Marketplace and health checks." }, { name: "OPS_WALLETS", set: false, purpose: "Wallets to monitor." }],
    checks: [{ label: "OPS_WALLETS parses", ok: null, detail: "OPS_WALLETS is not set. Defaults are used." }],
  },
};

const BODIES: Record<string, unknown> = {
  "/api/ops/overview": overview,
  "/api/ops/balances": balances,
  "/api/ops/payments": payments,
  "/api/ops/contracts": contracts,
  "/api/ops/marketplace": marketplace,
  "/api/ops/infra": infra,
};

let fetchMock: ReturnType<typeof vi.fn>;
let overrides: Record<string, unknown>;

beforeEach(() => {
  clearOpsDataCache();
  overrides = {};
  fetchMock = vi.fn(async (url: string) => {
    const path = url.split("?")[0];
    return new Response(JSON.stringify(overrides[path] ?? BODIES[path]), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function loaded(title: string) {
  expect(screen.getByRole("status", { name: new RegExp(`Loading ${title}`, "i") })).toHaveAttribute("aria-busy", "true");
  await waitFor(() => expect(screen.queryByRole("status", { name: /Loading/ })).toBeNull());
  expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
}

describe("OverviewSection", () => {
  it("lists every check with its status, detail and a link to its section", async () => {
    render(<OverviewSection />);
    await loaded("Overview");
    expect(screen.getByText("3 checks")).toBeInTheDocument();
    expect(screen.getByText("1 failing")).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole("link", { name: "Wallets" })).toHaveAttribute("href", "/ops/wallets");
    expect(within(rows[0]).getByText("1 balance below minimum")).toBeInTheDocument();
    expect(within(rows[2]).getByRole("link", { name: /Last settlement, Arbitrum Sepolia/ })).toHaveAttribute("href", "/ops/payments");
    expect(within(rows[2]).getByRole("link", { name: /Transaction/ })).toHaveAttribute("href", `${ARB}/tx/${ARB_TX}`);
  });
});

describe("WalletsSection", () => {
  it("shows balances per chain, flags the low one and offers the top-up form", async () => {
    render(<WalletsSection />);
    await loaded("Wallets");
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("0.001")).toBeInTheDocument();
    expect(within(table).getAllByText("Low")).toHaveLength(1);
    expect(screen.getByText("1 below minimum")).toBeInTheDocument();
    expect(within(table).getAllByText("999.05")).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 2, name: "Send testnet ETH" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("selects the wallet and network in the form when Top up is pressed", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<WalletsSection />);
    await loaded("Wallets");
    await userEvent.click(screen.getByRole("button", { name: "Top up Settler on Robinhood Chain Testnet" }));
    expect(screen.getByLabelText("To")).toHaveValue(SETTLER);
    expect(screen.getByLabelText("Network")).toHaveValue("46630");
  });

  it("refreshes past the server cache", async () => {
    render(<WalletsSection />);
    await loaded("Wallets");
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/ops/balances?fresh=1", expect.anything()));
  });
});

describe("PaymentsSection", () => {
  it("shows the totals and both settlement transactions with explorer links", async () => {
    render(<PaymentsSection />);
    await loaded("Payments");
    const term = (label: string) => screen.getByText(label, { selector: "dt" }).parentElement!;
    expect(term("Payments")).toHaveTextContent("2");
    expect(term("Volume")).toHaveTextContent("0.1mUSDG");
    expect(term("Unique payers")).toHaveTextContent("1");
    expect(term("Via facilitator")).toHaveTextContent("2 of 2");
    expect(screen.getByRole("link", { name: /0xd2d5a385…521d89/ })).toHaveAttribute("href", `${ARB}/tx/${ARB_TX}`);
    expect(screen.getByRole("link", { name: /0x73f27e20…f3fc6b/ })).toHaveAttribute("href", `${RH}/tx/${RH_TX}`);
    expect(screen.getAllByText("Settled")).toHaveLength(2);
    expect(screen.getByText(/blocks 314,673,947 to 314,693,208, 2 events/)).toBeInTheDocument();
  });

  it("filters by chain and by event type", async () => {
    render(<PaymentsSection />);
    await loaded("Payments");
    const bodyRows = () => within(screen.getByRole("table")).getAllByRole("row").length - 1;
    expect(bodyRows()).toBe(3);
    await userEvent.click(within(screen.getByRole("group", { name: "Event type" })).getByRole("button", { name: "Payments" }));
    expect(bodyRows()).toBe(2);
    await userEvent.click(within(screen.getByRole("group", { name: "Chain" })).getByRole("button", { name: "Robinhood" }));
    expect(bodyRows()).toBe(1);
    expect(within(screen.getByRole("group", { name: "Chain" })).getByRole("button", { name: "Robinhood" })).toHaveAttribute("aria-pressed", "true");
  });

  it("says so when a chain could not be read or the range was cut", async () => {
    overrides["/api/ops/payments"] = {
      ...payments,
      chains: [
        { ...payments.chains[0], range: { fromBlock: 314493208, toBlock: 314693208, truncated: true } },
        { ...payments.chains[1], ok: false, error: "RPC unavailable", range: null, rows: [], rowCount: 0 },
      ],
    };
    render(<PaymentsSection />);
    await loaded("Payments");
    expect(screen.getByRole("alert")).toHaveTextContent("Robinhood Chain Testnet: RPC unavailable. Totals leave this chain out.");
    expect(screen.getByText(/the RPC limited the block range/)).toBeInTheDocument();
  });
});

describe("ContractsSection", () => {
  it("shows the four contracts per chain with code, owner, pause and settler state", async () => {
    render(<ContractsSection />);
    await loaded("Contracts");
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(within(table).getAllByRole("rowheader").map((header) => header.textContent)).toEqual([
        expect.stringContaining("MockUSDG"), expect.stringContaining("X402Facilitator"), expect.stringContaining("AgentRegistry"), expect.stringContaining("RoboticsMarketplace"),
      ]);
      expect(within(table).getAllByText("Present")).toHaveLength(4);
      expect(within(table).getAllByText("Not pausable")).toHaveLength(4);
      expect(within(table).getByText("Mock USDG (Demo)")).toBeInTheDocument();
      expect(within(table).getByText(/EIP-712 version 1, 6 decimals/)).toBeInTheDocument();
    }
    expect(within(tables[0]).getByText(/approved/)).toHaveTextContent("Settler 0xd98a…F473 approved");
    expect(within(tables[1]).getByText(/not approved/)).toHaveTextContent("Settler 0xd98a…F473 not approved");
    expect(within(tables[0]).getAllByRole("link", { name: /0xBbB4…dDD4/ })[0]).toHaveAttribute("href", `${ARB}/address/${TOKEN}`);
  });

  it("separates unknown from absent when a chain's RPC is down", async () => {
    const down = chainContracts(46630, "Robinhood Chain Testnet", RH, true);
    overrides["/api/ops/contracts"] = {
      ...contracts,
      chains: [contracts.chains[0], { ...down, reachable: false, contracts: down.contracts.map((contract) => ({ ...contract, codePresent: null, owner: { status: "error" }, paused: { status: "error" } })) }],
    };
    render(<ContractsSection />);
    await loaded("Contracts");
    expect(screen.getByRole("alert")).toHaveTextContent("The Robinhood Chain Testnet RPC did not answer");
    expect(within(screen.getAllByRole("table")[1]).getAllByText("Unknown")).toHaveLength(12);
  });
});

describe("MarketplaceSection", () => {
  it("shows the dataset catalog, the gear catalog and the order count", async () => {
    render(<MarketplaceSection />);
    await loaded("Marketplace");
    expect(screen.getByText("Kitchen Cooking POV")).toBeInTheDocument();
    expect(screen.getByText("0.05 mUSDG")).toBeInTheDocument();
    expect(screen.getByText("30 items, 5 with a price")).toBeInTheDocument();
    expect(screen.getByText("Recording Devices")).toBeInTheDocument();
    expect(screen.getByText("Orders recorded").parentElement).toHaveTextContent("3");
  });

  it.each([
    ["unreachable", "The x402 server at https://x402.example.test is unreachable", "alert"],
    ["invalid", "answered, but not with a dataset catalog", "alert"],
    ["unconfigured", "Set X402_SERVER_URL", "status"],
  ] as const)("shows a clear %s state and still shows gear and orders", async (state, text, role) => {
    overrides["/api/ops/marketplace"] = { ...marketplace, catalog: { state, origin: state === "unconfigured" ? null : "https://x402.example.test", datasets: [] }, orders: { state: "unavailable", count: null, latestAt: null } };
    render(<MarketplaceSection />);
    await loaded("Marketplace");
    expect(screen.getByRole(role)).toHaveTextContent(text);
    expect(screen.queryByText("Kitchen Cooking POV")).toBeNull();
    expect(screen.getByText("Recording Devices")).toBeInTheDocument();
    expect(screen.getByText("Order store is not readable on this runtime")).toBeInTheDocument();
  });
});

describe("InfraSection", () => {
  it("shows RPC status, the x402 server, the build, CI runs and the configuration report", async () => {
    render(<InfraSection />);
    await loaded("Infra");
    const rpc = screen.getByRole("region", { name: "RPC endpoints" });
    expect(within(rpc).getByText("Reachable")).toBeInTheDocument();
    expect(within(rpc).getByText("Unreachable")).toBeInTheDocument();
    expect(within(rpc).getByText("101 ms")).toBeInTheDocument();
    expect(within(rpc).getByText("314,693,208")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /d362ad356185/ })).toHaveAttribute("href", "https://github.com/DigiPaga/digi-robotics/commit/d362ad3561850360abba2459f4ee38d7b0ddf53d");
    const ci = screen.getByRole("region", { name: "CI runs on main" });
    expect(within(ci).getByText("Passed")).toBeInTheDocument();
    expect(within(ci).getByRole("link", { name: /CI/ })).toHaveAttribute("href", "https://github.com/DigiPaga/digi-robotics/actions/runs/1");
    const config = screen.getByRole("region", { name: "Optional configuration" });
    expect(within(config).getByText("X402_SERVER_URL").closest("tr")).toHaveTextContent("Set");
    expect(within(config).getByText("OPS_WALLETS").closest("tr")).toHaveTextContent("Not set");
  });

  it("explains a GitHub rate limit instead of showing an empty table", async () => {
    overrides["/api/ops/infra"] = { ...infra, ci: { ...infra.ci, state: "rate_limited", runs: [], rateLimitResetAt: "2026-10-01T17:00:00.000Z" }, build: { ...infra.build, commit: null, builtAt: null } };
    render(<InfraSection />);
    await loaded("Infra");
    expect(screen.getByText(/GitHub rate limit reached/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "CI runs on main" })).toBeNull();
    expect(screen.getByText(/Set NEXT_PUBLIC_COMMIT_SHA at build time/)).toBeInTheDocument();
  });
});

describe("section failure", () => {
  it("offers a retry when the first load fails and recovers", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("{}", { status: 502 }));
    render(<ContractsSection />);
    expect(await screen.findByRole("alert")).toHaveTextContent("This section could not be loaded");
    expect(screen.getByRole("heading", { level: 1, name: "Contracts" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getAllByRole("table")).toHaveLength(2));
  });
});

describe("loading skeletons", () => {
  it.each([
    ["Overview", OverviewSkeleton, OverviewSection],
    ["Wallets", WalletsSkeleton, WalletsSection],
    ["Payments", PaymentsSkeleton, PaymentsSection],
    ["Contracts", ContractsSkeleton, ContractsSection],
    ["Marketplace", MarketplaceSkeleton, MarketplaceSection],
    ["Infra", InfraSkeleton, InfraSection],
  ] as const)("%s keeps the title, description and block headings of the loaded section", async (title, Skeleton, Section) => {
    const skeleton = render(<Skeleton />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(title);
    const description = heading.nextElementSibling?.textContent;
    const blocks = screen.queryAllByRole("heading", { level: 2 }).map((item) => item.textContent);
    skeleton.unmount();

    render(<Section />);
    await waitFor(() => expect(screen.queryByRole("status", { name: /Loading/ })).toBeNull());
    expect(screen.getByRole("heading", { level: 1 }).nextElementSibling?.textContent).toBe(description);
    expect(screen.queryAllByRole("heading", { level: 2 }).map((item) => item.textContent)).toEqual(blocks);
  });
});
