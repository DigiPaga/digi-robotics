import { Skeleton, tableClass, tdClass, thClass } from "./primitives";

/**
 * Loading states. Each one uses the same header, table and row boxes as the
 * section it stands in for, so nothing moves when the data arrives. Shared by
 * the route `loading.tsx` files and by the sections' own first load.
 */
export function HeaderSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <header className="flex flex-col gap-3 border-b border-ops-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold leading-7 tracking-[-.01em] text-ops-fg">{title}</h1>
        <p className="mt-0.5 text-[13px] text-ops-fg-2">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-[5.25rem] !rounded-md" />
      </div>
    </header>
  );
}

const WIDTHS = ["w-24", "w-32", "w-20", "w-28", "w-16", "w-36"] as const;

export function TableSkeleton({ columns, rows, tall = false }: { columns: readonly string[]; rows: number; tall?: boolean }) {
  return (
    <table className={tableClass} aria-hidden="true">
      <thead>
        <tr>{columns.map((column) => <th key={column} scope="col" className={thClass}>{column}</th>)}</tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, row) => (
          <tr key={row}>
            {columns.map((column, index) => (
              <td key={column} className={tdClass}>
                <Skeleton className={`h-3 my-1 ${WIDTHS[(row + index) % WIDTHS.length]}`} />
                {tall ? <Skeleton className={`mt-2.5 h-3 mb-1 ${WIDTHS[(row + index + 2) % WIDTHS.length]}`} /> : null}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function BlockSkeleton({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9 first:mt-7">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="text-[14px] font-semibold text-ops-fg">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function FactsSkeleton({ labels }: { labels: readonly string[] }) {
  return (
    <dl className="border-t border-ops-line" aria-hidden="true">
      {labels.map((label, index) => (
        <div key={label} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-baseline gap-4 border-b border-ops-line py-2.5 text-[13px] sm:grid-cols-[13rem_minmax(0,1fr)]">
          <dt className="text-ops-fg-3">{label}</dt>
          <dd><Skeleton className={`my-1 h-3 ${WIDTHS[index % WIDTHS.length]}`} /></dd>
        </div>
      ))}
    </dl>
  );
}

function Busy({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${label}`}>
      {children}
    </div>
  );
}

export const OVERVIEW_ROWS = 7;

export function OverviewSkeleton() {
  return (
    <Busy label="overview">
      <HeaderSkeleton title="Overview" description="Health of the testnet deployment at a glance." />
      <div className="flex h-11 items-center"><Skeleton className="h-3 w-56" /></div>
      <ul className="border-t border-ops-line" aria-hidden="true">
        {Array.from({ length: OVERVIEW_ROWS }, (_, row) => (
          <li key={row} className="grid min-h-[3.75rem] grid-cols-1 items-center gap-x-6 gap-y-1 border-b border-ops-line py-2.5 md:grid-cols-[13.5rem_minmax(0,1fr)_auto]">
            <Skeleton className={`h-3 ${WIDTHS[row % WIDTHS.length]}`} />
            <div>
              <Skeleton className="my-1 h-3 w-40" />
              <Skeleton className="mb-1 mt-2.5 h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="hidden h-3 w-16 md:block" />
          </li>
        ))}
      </ul>
    </Busy>
  );
}

export function WalletsSkeleton() {
  return (
    <Busy label="wallets">
      <HeaderSkeleton title="Wallets" description="ETH and mUSDG balances of the operational wallets." />
      <BlockSkeleton title="Balances">
        <TableSkeleton columns={["Wallet", "Arbitrum Sepolia", "Robinhood Chain Testnet"]} rows={2} tall />
      </BlockSkeleton>
      <BlockSkeleton title="Send testnet ETH">
        <Skeleton className="h-3 w-80 max-w-full" />
        <div className="mt-4 grid max-w-4xl gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-9 !rounded-md" />)}
        </div>
      </BlockSkeleton>
    </Busy>
  );
}

export const PAYMENT_COLUMNS = ["Time", "Chain", "Type", "From", "To", "Amount", "Resource", "Transaction"] as const;

export function PaymentsSkeleton() {
  return (
    <Busy label="payments">
      <HeaderSkeleton title="Payments" description="x402 settlements and mUSDG transfers on both testnets." />
      <div className="grid grid-cols-2 border-b border-ops-line sm:grid-cols-4" aria-hidden="true">
        {["Payments", "Volume", "Unique payers", "Via facilitator"].map((label) => (
          <div key={label} className="py-4 pr-4">
            <p className="text-[12.5px] text-ops-fg-3">{label}</p>
            <Skeleton className="mt-2 mb-1 h-4 w-16" />
          </div>
        ))}
      </div>
      <BlockSkeleton title="Events">
        <TableSkeleton columns={PAYMENT_COLUMNS} rows={6} />
      </BlockSkeleton>
    </Busy>
  );
}

export const CONTRACT_COLUMNS = ["Contract", "Address", "Code", "Owner", "Paused", "Details"] as const;

export function ContractsSkeleton() {
  return (
    <Busy label="contracts">
      <HeaderSkeleton title="Contracts" description="Deployed contracts, owners and settler status per chain." />
      {["Arbitrum Sepolia", "Robinhood Chain Testnet"].map((chain) => (
        <BlockSkeleton key={chain} title={chain}>
          <TableSkeleton columns={CONTRACT_COLUMNS} rows={4} tall />
        </BlockSkeleton>
      ))}
    </Busy>
  );
}

export const DATASET_COLUMNS = ["Dataset", "Price", "Network", "Asset", "Seller"] as const;

export function MarketplaceSkeleton() {
  return (
    <Busy label="marketplace">
      <HeaderSkeleton title="Marketplace" description="Dataset catalog from the x402 server, gear catalog and orders." />
      <BlockSkeleton title="Datasets">
        <TableSkeleton columns={DATASET_COLUMNS} rows={3} tall />
      </BlockSkeleton>
      <BlockSkeleton title="Gear catalog">
        <TableSkeleton columns={["Category", "Items"]} rows={6} />
      </BlockSkeleton>
      <BlockSkeleton title="Orders">
        <FactsSkeleton labels={["Orders recorded", "Latest order"]} />
      </BlockSkeleton>
    </Busy>
  );
}

export const RPC_COLUMNS = ["Chain", "Endpoint", "Status", "Latency", "Latest block", "Block age"] as const;
export const CI_COLUMNS = ["Workflow", "Result", "Commit", "Title", "Updated"] as const;
export const CONFIG_COLUMNS = ["Variable", "State", "Used for"] as const;

export function InfraSkeleton() {
  return (
    <Busy label="infra">
      <HeaderSkeleton title="Infra" description="RPC endpoints, x402 server, build and CI." />
      <BlockSkeleton title="RPC">
        <TableSkeleton columns={RPC_COLUMNS} rows={2} />
      </BlockSkeleton>
      <BlockSkeleton title="x402 server">
        <FactsSkeleton labels={["Status", "Server", "Mode", "Latency"]} />
      </BlockSkeleton>
      <BlockSkeleton title="Build">
        <FactsSkeleton labels={["Commit", "Built", "Runtime", "Environment"]} />
      </BlockSkeleton>
      <BlockSkeleton title="CI on main">
        <TableSkeleton columns={CI_COLUMNS} rows={5} />
      </BlockSkeleton>
      <BlockSkeleton title="Configuration">
        <TableSkeleton columns={CONFIG_COLUMNS} rows={8} />
      </BlockSkeleton>
    </Busy>
  );
}
