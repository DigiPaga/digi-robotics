import test from "node:test";

test("live x402 settlement and unlock", { skip: "Set RUN_LIVE_X402_TEST=1 only after explicit approval to spend 0.05 Base Sepolia test USDC." }, () => {
  // The runbook uses the production /agent-demo/runs API so the live check exercises
  // discovery, policy validation, EIP-3009 signing, facilitator settlement, and unlock.
});
