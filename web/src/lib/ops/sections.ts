/**
 * The console's sections: one route under /ops and one data endpoint under
 * /api/ops each. Public configuration, shared by the server and the client.
 */
export const OPS_SECTIONS = [
  { id: "overview", label: "Overview", href: "/ops", api: "/api/ops/overview", key: "o", summary: "Health at a glance" },
  { id: "wallets", label: "Wallets", href: "/ops/wallets", api: "/api/ops/balances", key: "w", summary: "Balances and testnet top-up" },
  { id: "payments", label: "Payments", href: "/ops/payments", api: "/api/ops/payments", key: "p", summary: "x402 settlements and mUSDG transfers" },
  { id: "contracts", label: "Contracts", href: "/ops/contracts", api: "/api/ops/contracts", key: "c", summary: "Addresses, owners and settler status" },
  { id: "marketplace", label: "Marketplace", href: "/ops/marketplace", api: "/api/ops/marketplace", key: "m", summary: "Dataset catalog, gear and orders" },
  { id: "infra", label: "Infra", href: "/ops/infra", api: "/api/ops/infra", key: "i", summary: "RPC, x402 server, build and CI" },
] as const;

export type OpsSection = (typeof OPS_SECTIONS)[number];
export type OpsSectionId = OpsSection["id"];

export function getOpsSection(id: OpsSectionId): OpsSection {
  return OPS_SECTIONS.find((section) => section.id === id)!;
}

/** The section a pathname belongs to. `/ops/wallets/anything` is still Wallets. */
export function sectionForPath(pathname: string | null | undefined): OpsSection | null {
  if (!pathname) return null;
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/ops") return OPS_SECTIONS[0];
  return OPS_SECTIONS.find((section) => section.href !== "/ops" && (clean === section.href || clean.startsWith(`${section.href}/`))) ?? null;
}

/** `g` then this key jumps to the section. */
export function sectionForKey(key: string): OpsSection | null {
  const lower = key.toLowerCase();
  return OPS_SECTIONS.find((section) => section.key === lower) ?? null;
}
