import type { AgentDemoEnv } from "../config/env";
import type { PublicDataset } from "../types/agentDemo";

const DATASET_BLUEPRINTS = [
  {
    id: "engine-assembly-pov",
    title: "Engine Assembly POV",
    description: "Egocentric torque, alignment, and fastener sequences for manipulation-policy training.",
    tags: ["robotics", "egocentric", "manipulation", "engine-assembly"],
    mimeType: "application/vnd.digirobotics.dataset+json",
  },
  {
    id: "kitchen-cooking-pov",
    title: "Kitchen Cooking POV",
    description: "First-person utensil, grasp, and multi-stage food-preparation trajectories.",
    tags: ["robotics", "egocentric", "cooking", "dexterity"],
    mimeType: "application/vnd.digirobotics.dataset+json",
  },
  {
    id: "warehouse-picking-pov",
    title: "Warehouse Picking POV",
    description: "Shelf localization, reach, pick, and placement episodes across varied packaging.",
    tags: ["robotics", "egocentric", "warehouse", "picking"],
    mimeType: "application/vnd.digirobotics.dataset+json",
  },
] as const;

export function createPublicDatasets(env: AgentDemoEnv): PublicDataset[] {
  return DATASET_BLUEPRINTS.map(dataset => ({
    ...dataset,
    tags: [...dataset.tags],
    priceDisplay: `${env.priceDisplay} ${env.assetSymbol}`,
    network: env.network,
    assetSymbol: env.assetSymbol,
    assetAddress: env.assetAddress,
    sellerAddress: env.payTo,
    resourceUrl: `${env.resourceBaseUrl}/x402/datasets/${dataset.id}/content`,
  }));
}

export function getPublicDataset(env: AgentDemoEnv, id: string): PublicDataset | undefined {
  return createPublicDatasets(env).find(dataset => dataset.id === id);
}
