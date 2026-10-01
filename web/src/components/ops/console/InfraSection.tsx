"use client";

import { useOpsData } from "@/lib/ops/client/use-ops-data";
import type { CiRun } from "@/lib/ops/github";
import type { InfraSnapshot } from "@/lib/ops/infra";
import { getOpsSection } from "@/lib/ops/sections";
import { formatDuration, formatInteger } from "./format";
import { Block, ExternalLink, Fact, Facts, LoadFailed, monoClass, Notice, SectionHeader, Status, TableScroll, tableClass, tdClass, thClass, type Tone } from "./primitives";
import { CI_COLUMNS, CONFIG_COLUMNS, InfraSkeleton, RPC_COLUMNS } from "./skeletons";
import { RelativeTime } from "./ui";

const SECTION = getOpsSection("infra");

/** A testnet block older than this suggests a stalled chain or node. */
const STALE_BLOCK_SECONDS = 600;

function runResult(run: CiRun): { tone: Tone; label: string } {
  if (run.status !== "completed") return { tone: "warn", label: run.status === "queued" ? "Queued" : "Running" };
  if (run.conclusion === "success") return { tone: "ok", label: "Passed" };
  if (run.conclusion === "cancelled") return { tone: "warn", label: "Cancelled" };
  if (run.conclusion === "skipped") return { tone: "unknown", label: "Skipped" };
  return { tone: "bad", label: "Failed" };
}

export function InfraSection() {
  const { data, error, loading, validating, updatedAt, refresh } = useOpsData<InfraSnapshot>(SECTION.api, { refreshInterval: 30_000 });
  if (loading) return <InfraSkeleton />;

  return (
    <>
      <SectionHeader title="Infra" description="RPC endpoints, x402 server, build and CI." updatedAt={updatedAt} validating={validating} error={error} onRefresh={() => void refresh()} />
      {!data ? <LoadFailed onRetry={() => void refresh()} /> : (
        <>
          {error ? <div className="mt-4"><Notice role="status">The last update failed. Showing the previous result.</Notice></div> : null}
          <Block title="RPC">
            <TableScroll label="RPC endpoints">
              <table className={`${tableClass} min-w-[760px]`}>
                <thead>
                  <tr>{RPC_COLUMNS.map((column) => <th key={column} scope="col" className={thClass}>{column}</th>)}</tr>
                </thead>
                <tbody>
                  {data.rpc.map((rpc) => (
                    <tr key={rpc.chainId}>
                      <th scope="row" className={`${tdClass} whitespace-nowrap font-medium text-ops-fg`}>{rpc.name} <span className="font-ops-mono text-[12px] font-normal text-ops-fg-3">{rpc.chainId}</span></th>
                      <td className={tdClass}><span className={`${monoClass} text-ops-fg-2`}>{rpc.host}</span></td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {!rpc.ok ? <Status tone="bad">Unreachable</Status> : rpc.chainIdMatches === false ? <Status tone="bad">Wrong chain id</Status> : <Status tone="ok">Reachable</Status>}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}><span className={monoClass}>{rpc.latencyMs === null ? "n/a" : `${rpc.latencyMs} ms`}</span></td>
                      <td className={`${tdClass} whitespace-nowrap`}><span className={monoClass}>{formatInteger(rpc.blockNumber)}</span></td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {rpc.blockAgeSeconds !== null && rpc.blockAgeSeconds > STALE_BLOCK_SECONDS
                          ? <Status tone="warn">{formatDuration(rpc.blockAgeSeconds)}, no recent block</Status>
                          : <span className={monoClass}>{formatDuration(rpc.blockAgeSeconds)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <p className="mt-3 max-w-[70ch] text-[12.5px] text-ops-fg-3">Latency is one JSON-RPC batch from this server to the endpoint, not from your browser.</p>
          </Block>

          <Block title="x402 server">
            <Facts>
              <Fact label="Status">
                {data.x402.state === "ok" ? <Status tone="ok">Healthy</Status>
                  : data.x402.state === "unconfigured" ? <Status tone="unknown">Not configured. Set X402_SERVER_URL.</Status>
                    : data.x402.state === "unreachable" ? <Status tone="bad">Unreachable. No answer from /health within 4 seconds.</Status>
                      : <Status tone="bad">Unhealthy{data.x402.httpStatus ? `, HTTP ${data.x402.httpStatus}` : ""}. /health did not return status ok.</Status>}
              </Fact>
              <Fact label="Server">{data.x402.origin ? <span className={monoClass}>{data.x402.origin}</span> : <span className="text-ops-fg-3">n/a</span>}</Fact>
              <Fact label="Mode">
                {data.x402.mode
                  ? <><span className={monoClass}>{data.x402.mode}</span>{data.x402.mode === "BLOCKED" ? <span className="ml-2 text-ops-warn">No signer configured, it cannot settle payments.</span> : null}</>
                  : <span className="text-ops-fg-3">n/a</span>}
              </Fact>
              <Fact label="Latency">{data.x402.latencyMs === null ? <span className="text-ops-fg-3">n/a</span> : <span className={monoClass}>{data.x402.latencyMs} ms</span>}</Fact>
            </Facts>
          </Block>

          <Block title="Build">
            <Facts>
              <Fact label="Commit">
                {data.build.commit
                  ? <ExternalLink href={`https://github.com/${data.ci.repo}/commit/${data.build.commit}`}><span className={monoClass}>{data.build.commit.slice(0, 12)}</span></ExternalLink>
                  : <span className="text-ops-fg-3">Not recorded. Set NEXT_PUBLIC_COMMIT_SHA at build time.</span>}
              </Fact>
              <Fact label="Built">{data.build.builtAt ? <RelativeTime iso={data.build.builtAt} /> : <span className="text-ops-fg-3">Not recorded. Set NEXT_PUBLIC_BUILD_TIME at build time.</span>}</Fact>
              <Fact label="Runtime">{data.build.runtime}</Fact>
              <Fact label="Environment">{data.build.nodeEnv}</Fact>
            </Facts>
          </Block>

          <Block title="CI on main" aside={<ExternalLink href={`https://github.com/${data.ci.repo}/actions`}>{data.ci.repo}</ExternalLink>}>
            {data.ci.state === "rate_limited" ? (
              <Notice tone="unknown" role="status">GitHub rate limit reached (60 requests per hour without a token). {data.ci.rateLimitResetAt ? <>It resets <RelativeTime iso={data.ci.rateLimitResetAt} />.</> : null}</Notice>
            ) : data.ci.state === "unavailable" ? (
              <Notice tone="unknown" role="status">GitHub did not answer. CI status is unknown until the next refresh.</Notice>
            ) : (
              <>
                {data.ci.state === "stale" ? <div className="mb-3"><Notice role="status">GitHub is refusing requests right now. Showing runs fetched <RelativeTime iso={data.ci.fetchedAt} />.</Notice></div> : null}
                <TableScroll label="CI runs on main">
                  <table className={`${tableClass} min-w-[760px]`}>
                    <thead>
                      <tr>{CI_COLUMNS.map((column) => <th key={column} scope="col" className={thClass}>{column}</th>)}</tr>
                    </thead>
                    <tbody>
                      {data.ci.runs.length === 0 ? (
                        <tr><td colSpan={CI_COLUMNS.length} className={`${tdClass} py-6 text-ops-fg-3`}>No workflow run on main yet.</td></tr>
                      ) : data.ci.runs.map((run) => {
                        const result = runResult(run);
                        return (
                          <tr key={run.id}>
                            <th scope="row" className={`${tdClass} whitespace-nowrap font-normal`}><ExternalLink href={run.url}>{run.workflow}</ExternalLink></th>
                            <td className={`${tdClass} whitespace-nowrap`}><Status tone={result.tone}>{result.label}</Status></td>
                            <td className={tdClass}><span className={`${monoClass} text-ops-fg-2`}>{run.sha.slice(0, 7)}</span></td>
                            <td className={`${tdClass} max-w-[26rem] truncate text-ops-fg-2`} title={run.title}>{run.title}</td>
                            <td className={`${tdClass} whitespace-nowrap`}><RelativeTime iso={run.updatedAt} className="text-ops-fg-2" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableScroll>
              </>
            )}
          </Block>

          <Block title="Configuration" aside="Names only. Values never leave the server.">
            <TableScroll label="Optional configuration">
              <table className={`${tableClass} min-w-[720px]`}>
                <thead>
                  <tr>{CONFIG_COLUMNS.map((column) => <th key={column} scope="col" className={thClass}>{column}</th>)}</tr>
                </thead>
                <tbody>
                  {data.config.items.map((item) => (
                    <tr key={item.name}>
                      <th scope="row" className={`${tdClass} font-normal`}><span className={`${monoClass} text-ops-fg`}>{item.name}</span></th>
                      <td className={`${tdClass} whitespace-nowrap`}>{item.set ? <Status tone="ok">Set</Status> : <Status tone="unknown">Not set</Status>}</td>
                      <td className={`${tdClass} text-ops-fg-2`}>{item.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <ul className="mt-4 space-y-1.5 text-[13px]">
              {data.config.checks.map((check) => (
                <li key={check.label} className="flex flex-wrap items-baseline gap-x-3">
                  <Status tone={check.ok === null ? "unknown" : check.ok ? "ok" : "bad"}>{check.label}</Status>
                  <span className="text-ops-fg-3">{check.detail}</span>
                </li>
              ))}
            </ul>
          </Block>
        </>
      )}
    </>
  );
}
