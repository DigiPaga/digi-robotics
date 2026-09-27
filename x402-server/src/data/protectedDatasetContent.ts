import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

interface ProtectedDatasetRecord {
  storageRef: string;
  manifest: {
    license: string;
    sequences: number;
    modalities: string[];
    sampleRateHz: number;
  };
}

const protectedRegistry: Record<string, ProtectedDatasetRecord> = {
  "engine-assembly-pov": {
    storageRef: "private://digirobotics/engine-assembly-pov/v1",
    manifest: { license: "Hackathon evaluation", sequences: 128, modalities: ["rgb", "depth", "pose", "gripper"], sampleRateHz: 30 },
  },
  "kitchen-cooking-pov": {
    storageRef: "private://digirobotics/kitchen-cooking-pov/v1",
    manifest: { license: "Hackathon evaluation", sequences: 96, modalities: ["rgb", "pose", "action"], sampleRateHz: 30 },
  },
  "warehouse-picking-pov": {
    storageRef: "private://digirobotics/warehouse-picking-pov/v1",
    manifest: { license: "Hackathon evaluation", sequences: 164, modalities: ["rgb", "depth", "pose", "labels"], sampleRateHz: 24 },
  },
};

const signingSecret = randomBytes(32);

export function hasProtectedDataset(id: string): boolean {
  return Object.hasOwn(protectedRegistry, id);
}

export function issueDatasetAccess(baseUrl: string, id: string, ttlSeconds = 300) {
  if (!hasProtectedDataset(id)) throw new Error("Unknown protected dataset");
  const expiresAtSeconds = Math.floor(Date.now() / 1_000) + ttlSeconds;
  const payload = `${id}.${expiresAtSeconds}`;
  const signature = createHmac("sha256", signingSecret).update(payload).digest("hex");
  return {
    signedUrl: `${baseUrl}/x402/datasets/${id}/download?expires=${expiresAtSeconds}&signature=${signature}`,
    expiresAt: new Date(expiresAtSeconds * 1_000).toISOString(),
  };
}

export function readProtectedDataset(id: string, expires: string, signature: string) {
  const record = protectedRegistry[id];
  const expiry = Number(expires);
  if (!record || !Number.isSafeInteger(expiry) || expiry < Math.floor(Date.now() / 1_000)) return undefined;
  const expected = createHmac("sha256", signingSecret).update(`${id}.${expiry}`).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "hex");
  } catch {
    return undefined;
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return undefined;
  return { datasetId: id, storageRef: record.storageRef, manifest: record.manifest };
}

export function protectedRegistryKeysForTest(): string[] {
  return Object.keys(protectedRegistry);
}
