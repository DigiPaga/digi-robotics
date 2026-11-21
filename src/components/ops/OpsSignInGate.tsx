"use client";

import { useSearchParams } from "next/navigation";
import { OpsSignIn } from "./OpsPanels";

/**
 * The sign-in screen is rendered by the console layout, and a layout does not
 * receive search params, so the `?error=` code from the OAuth callback is read
 * here. The code only selects one of two fixed sentences.
 */
export function OpsSignInGate() {
  const error = useSearchParams().get("error");
  return <OpsSignIn error={error ?? undefined} />;
}
