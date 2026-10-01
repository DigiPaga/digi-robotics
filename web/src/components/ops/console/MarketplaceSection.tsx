"use client";

import { useOpsData } from "@/lib/ops/client/use-ops-data";
import type { MarketplaceSnapshot } from "@/lib/ops/marketplace";
import { getOpsSection } from "@/lib/ops/sections";
import type { X402State } from "@/lib/ops/x402-server";
import { formatInteger } from "./format";
import { Block, Fact, Facts, LoadFailed, monoClass, Notice, SectionHeader, Status, TableScroll, tableClass, tdClass, thClass } from "./primitives";
import { DATASET_COLUMNS, MarketplaceSkeleton } from "./skeletons";
import { AddressValue, RelativeTime } from "./ui";

const SECTION = getOpsSection("marketplace");

function CatalogState({ state, origin }: { state: X402State; origin: string | null }) {
  if (state === "ok") return null;
  if (state === "unconfigured") {
    return <Notice tone="unknown" role="status">No x402 server is configured. Set X402_SERVER_URL to the server origin to see its dataset catalog here.</Notice>;
  }
  if (state === "unreachable") {
    return <Notice tone="bad" role="alert">The x402 server at {origin} is unreachable. It did not answer within 4 seconds. Check that it is running, then refresh.</Notice>;
  }
  return <Notice tone="bad" role="alert">The x402 server at {origin} answered, but not with a dataset catalog. Check that the URL points at the x402 server and not at another service.</Notice>;
}

export function MarketplaceSection() {
  const { data, error, loading, validating, updatedAt, refresh } = useOpsData<MarketplaceSnapshot>(SECTION.api);
  if (loading) return <MarketplaceSkeleton />;

  return (
    <>
      <SectionHeader title="Marketplace" description="Dataset catalog from the x402 server, gear catalog and orders." updatedAt={updatedAt} validating={validating} error={error} onRefresh={() => void refresh()} />
      {!data ? <LoadFailed onRetry={() => void refresh()} /> : (
        <>
          {error ? <div className="mt-4"><Notice role="status">The last update failed. Showing the previous result.</Notice></div> : null}
          <Block
            title="Datasets"
            aside={data.catalog.state === "ok"
              ? <span>{formatInteger(data.catalog.datasets.length)} from <span className="font-ops-mono text-[12px]">{data.catalog.origin}</span>{data.x402.mode ? `, mode ${data.x402.mode}` : ""}</span>
              : <Status tone={data.catalog.state === "unconfigured" ? "unknown" : "bad"}>{data.catalog.state === "unconfigured" ? "Not configured" : data.catalog.state === "unreachable" ? "Server unreachable" : "Unexpected answer"}</Status>}
          >
            <CatalogState state={data.catalog.state} origin={data.catalog.origin} />
            {data.catalog.state === "ok" ? (
              <TableScroll label="Dataset catalog">
                <table className={`${tableClass} min-w-[820px]`}>
                  <thead>
                    <tr>{DATASET_COLUMNS.map((column) => <th key={column} scope="col" className={thClass}>{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.catalog.datasets.length === 0 ? (
                      <tr><td colSpan={DATASET_COLUMNS.length} className={`${tdClass} py-6 text-ops-fg-3`}>The x402 server lists no datasets.</td></tr>
                    ) : data.catalog.datasets.map((dataset) => (
                      <tr key={dataset.id}>
                        <th scope="row" className={`${tdClass} max-w-[26rem] font-normal`}>
                          <p className="font-medium text-ops-fg">{dataset.title}</p>
                          <p className="mt-0.5 text-[12.5px] text-ops-fg-3">{dataset.description}</p>
                          <p className={`mt-1 ${monoClass} !text-[12px] text-ops-fg-3`}>{dataset.id}</p>
                        </th>
                        <td className={`${tdClass} whitespace-nowrap`}><span className={`${monoClass} text-ops-fg`}>{dataset.priceDisplay || "n/a"}</span></td>
                        <td className={`${tdClass} whitespace-nowrap`}><span className={`${monoClass} text-ops-fg-2`}>{dataset.network || "n/a"}</span></td>
                        <td className={tdClass}>
                          <p className="text-ops-fg-2">{dataset.assetSymbol || "n/a"}</p>
                          {dataset.assetAddress ? <AddressValue address={dataset.assetAddress} label="Asset address" /> : null}
                        </td>
                        <td className={tdClass}>{dataset.sellerAddress ? <AddressValue address={dataset.sellerAddress} label="Seller address" /> : <span className="text-ops-fg-3">n/a</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : null}
          </Block>

          <Block title="Gear catalog" aside={<span>{formatInteger(data.gear.total)} items, {formatInteger(data.gear.priced)} with a price</span>}>
            <table className={`${tableClass} max-w-xl`}>
              <thead>
                <tr>
                  <th scope="col" className={thClass}>Category</th>
                  <th scope="col" className={`${thClass} text-right`}>Items</th>
                </tr>
              </thead>
              <tbody>
                {data.gear.categories.map((category) => (
                  <tr key={category.name}>
                    <th scope="row" className={`${tdClass} font-normal text-ops-fg-2`}>{category.name}</th>
                    <td className={`${tdClass} text-right`}><span className={`${monoClass} text-ops-fg`}>{category.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Block>

          <Block title="Orders">
            <Facts>
              <Fact label="Orders recorded">
                {data.orders.state === "unavailable"
                  ? <Status tone="unknown">Order store is not readable on this runtime</Status>
                  : <span className={monoClass}>{formatInteger(data.orders.count)}</span>}
              </Fact>
              <Fact label="Latest order">
                {data.orders.latestAt ? <RelativeTime iso={data.orders.latestAt} /> : <span className="text-ops-fg-3">{data.orders.state === "empty" ? "No order yet. Orders appear after a paid gear checkout." : "n/a"}</span>}
              </Fact>
            </Facts>
          </Block>
        </>
      )}
    </>
  );
}
