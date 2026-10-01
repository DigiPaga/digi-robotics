"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useOpsData } from "@/lib/ops/client/use-ops-data";
import type { CheckStatus, OverviewSnapshot } from "@/lib/ops/overview";
import { getOpsSection } from "@/lib/ops/sections";
import { Dot, ExternalLink, LoadFailed, Notice, SectionHeader, Status } from "./primitives";
import { OverviewSkeleton } from "./skeletons";
import { RelativeTime } from "./ui";

const SECTION = getOpsSection("overview");

const STATUS_WORD: Record<CheckStatus, string> = { ok: "ok", warn: "warning", bad: "failing", unknown: "unknown" };
const ORDER: CheckStatus[] = ["bad", "warn", "unknown", "ok"];

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function OverviewSection() {
  const { data, error, loading, validating, updatedAt, refresh } = useOpsData<OverviewSnapshot>(SECTION.api, { refreshInterval: 60_000 });
  if (loading) return <OverviewSkeleton />;

  return (
    <>
      <SectionHeader title="Overview" description="Health of the testnet deployment at a glance." updatedAt={updatedAt} validating={validating} error={error} onRefresh={() => void refresh()} />
      {!data ? <LoadFailed onRetry={() => void refresh()} /> : (
        <>
          <p className="flex h-11 flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ops-fg-2">
            <span>{plural(data.checks.length, "check")}</span>
            {ORDER.filter((status) => data.counts[status] > 0).map((status) => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <Dot tone={status} />
                {data.counts[status]} {STATUS_WORD[status]}
              </span>
            ))}
          </p>
          {error ? <div className="mb-3"><Notice role="status">The last update failed. Showing the previous result.</Notice></div> : null}
          <ul className="border-t border-ops-line">
            {data.checks.map((check) => (
              <li key={check.id} className="group relative grid min-h-[3.75rem] grid-cols-1 items-center gap-x-6 gap-y-1 border-b border-ops-line py-2.5 transition-colors duration-150 hover:bg-ops-fg/[.025] md:grid-cols-[13.5rem_minmax(0,1fr)_auto]">
                <Link href={check.href} prefetch className="text-[13px] text-ops-fg-2 after:absolute after:inset-0 after:content-[''] group-hover:text-ops-fg">
                  {check.label}
                </Link>
                <div className="min-w-0">
                  <Status tone={check.status} className="text-[14px] font-medium">{check.summary}</Status>
                  {check.detail ? <p className="mt-0.5 pl-3.5 text-[13px] text-ops-fg-3">{check.detail}</p> : null}
                </div>
                <div className="flex items-center gap-4 pl-3.5 text-[12.5px] text-ops-fg-3 md:justify-end md:pl-0">
                  {check.at ? <RelativeTime iso={check.at} className="font-ops-mono text-[12px]" /> : null}
                  {check.external ? <span className="relative z-10"><ExternalLink href={check.external.url}>{check.external.label}</ExternalLink></span> : null}
                  <ChevronRight size={14} aria-hidden="true" className="hidden text-ops-fg-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ops-fg md:block" />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
