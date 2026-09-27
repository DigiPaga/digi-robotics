import { HTTPFacilitatorClient } from "@x402/core/server";
import type { DiscoveryResource } from "@x402/extensions/bazaar";
import { withBazaar } from "@x402/extensions/bazaar";
import { getAddress, isAddress } from "viem";
import type { AgentDemoEnv } from "../config/env";
import { createPublicDatasets } from "../data/datasets";
import type { DiscoveryCandidate, PublicDataset } from "../types/agentDemo";

const QUERY = "robotics training data egocentric manipulation engine assembly";

export interface DatasetDiscovery {
  search(query?: string): Promise<DiscoveryCandidate[]>;
}

export function scoreCandidate(dataset: PublicDataset, source: DiscoveryCandidate["source"], env: AgentDemoEnv): DiscoveryCandidate {
  const haystack = `${dataset.title} ${dataset.description} ${dataset.tags.join(" ")}`.toLowerCase();
  const keywords = ["robotics", "training", "egocentric", "manipulation", "engine", "assembly"];
  const reasons: string[] = [];
  let score = keywords.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 8 : 0), 0);
  if (dataset.tags.includes("robotics")) { score += 18; reasons.push("robotics tag"); }
  if (dataset.tags.includes("egocentric")) { score += 18; reasons.push("egocentric tag"); }
  if (dataset.network === env.network) { score += 12; reasons.push("supported network"); }
  if (dataset.assetAddress === env.assetAddress) { score += 12; reasons.push("supported asset"); }
  const hostAllowed = env.allowedHosts.includes(new URL(dataset.resourceUrl).host.toLowerCase());
  const payToAllowed = env.allowedPayTo.includes(getAddress(dataset.sellerAddress));
  const policyEligible = hostAllowed && payToAllowed && dataset.network === env.network && dataset.assetAddress === env.assetAddress;
  if (hostAllowed) { score += 8; reasons.push("allowlisted host"); }
  if (payToAllowed) { score += 8; reasons.push("allowlisted seller"); }
  if (dataset.mimeType.includes("dataset")) { score += 6; reasons.push("expected dataset MIME"); }
  return { ...dataset, source, score, policyEligible, reasons };
}

function fromBazaar(resource: DiscoveryResource, env: AgentDemoEnv): DiscoveryCandidate | undefined {
  const requirement = resource.accepts.find(item => item.scheme === "exact" && item.network === env.network);
  if (!requirement || !isAddress(requirement.asset) || !isAddress(requirement.payTo)) return undefined;
  const url = new URL(resource.resource);
  const publicDataset: PublicDataset = {
    id: `bazaar-${Buffer.from(resource.resource).toString("base64url").slice(0, 12)}`,
    title: resource.serviceName ?? resource.description ?? "Bazaar x402 resource",
    description: resource.description ?? "x402-discovered resource",
    tags: resource.tags ?? [],
    mimeType: resource.mimeType ?? "application/octet-stream",
    priceDisplay: `${requirement.amount} atomic`,
    network: requirement.network,
    assetSymbol: env.assetSymbol,
    assetAddress: getAddress(requirement.asset),
    sellerAddress: getAddress(requirement.payTo),
    resourceUrl: url.toString(),
  };
  return { ...scoreCandidate(publicDataset, "bazaar", env), paymentRequirements: requirement };
}

export class BazaarFirstDiscovery implements DatasetDiscovery {
  constructor(private readonly env: AgentDemoEnv) {}

  async search(query = QUERY): Promise<DiscoveryCandidate[]> {
    let external: DiscoveryCandidate[] = [];
    try {
      const facilitator = withBazaar(new HTTPFacilitatorClient({ url: this.env.facilitatorUrl, timeoutMs: this.env.requestTimeoutMs }));
      const response = await facilitator.extensions.bazaar.search({ query, type: "http", network: this.env.network, scheme: "exact", limit: 10 });
      external = response.resources.map(item => fromBazaar(item, this.env)).filter((item): item is DiscoveryCandidate => Boolean(item));
    } catch {
      external = [];
    }

    const local = createPublicDatasets(this.env).map(dataset => scoreCandidate(dataset, "digirobotics", this.env));
    return [...external, ...local].sort((a, b) => {
      if (a.policyEligible !== b.policyEligible) return a.policyEligible ? -1 : 1;
      return b.score - a.score || a.title.localeCompare(b.title);
    });
  }
}

export function selectCandidate(candidates: DiscoveryCandidate[]): DiscoveryCandidate {
  const selected = candidates.find(candidate => candidate.policyEligible);
  if (!selected) throw new Error("No policy-eligible x402 resource was discovered");
  return selected;
}
