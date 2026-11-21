import { getZeroDevReadiness } from "./config";

/** Loads ZeroDev only after a real authenticated action requests it. */
export async function loadZeroDevRuntime() {
  const readiness = getZeroDevReadiness();
  if (!readiness.ready) return { readiness } as const;
  const [sdk, validator, permissions] = await Promise.all([
    import("@zerodev/sdk"),
    import("@zerodev/ecdsa-validator"),
    import("@zerodev/permissions"),
  ]);
  return { readiness, sdk, validator, permissions } as const;
}
