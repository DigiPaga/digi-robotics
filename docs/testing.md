# Testing

## Scope and tooling

| Area | Tool | Coverage |
| :--- | :--- | :--- |
| Backend types/build | TypeScript | Active x402 server entrypoint and its modules |
| Backend lint | ESLint | Active server, agent, x402, route, utility, and test modules |
| Backend unit/integration | Node test runner + `tsx` + Supertest | Catalog separation, scoring, policy, idempotency, redaction, unpaid HTTP 402 |
| Frontend types/lint/build | TypeScript, ESLint, Next.js | `/agent-demo` client boundary, SSE UI, production bundle |
| Backend end-to-end | `npm run test:e2e` on a local Anvil chain (needs Foundry) | Full mUSDG x402 flow: deploy, discover, pay, settle, unlock |
| Frontend unit | Vitest | `web/src/**/*.test.{ts,tsx}` |
| Contracts | Foundry | `contracts/test`, unit and fuzz tests |
| Live settlement | Run API plus the block explorer of the configured network (Arbiscan for the live Arbitrum Sepolia deployment) | Real EIP-3009 authorization, facilitator settlement, balance delta, unlock |

## Commands

```bash
cd x402-server
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build

cd ../web
npx tsc --noEmit
npm run lint
npm test
npm run build

cd ../contracts
forge build
forge test -vvv
```

`npm test` always skips the live settlement test (`src/tests/live-x402.test.ts` is a placeholder). A live purchase is run through the run API or UI, and only after a human has explicitly authorized spending test funds. The deterministic integration test still proves that the real x402 middleware returns a valid HTTP 402 declaration with no protected fields.

## Manual verification

Follow `x402-server/docs/AGENT_DEMO_RUNBOOK.md`. Capture the unpaid status/header, then record the paid transaction hash, successful explorer receipt, exact seller balance delta, and signed access response. A mocked hash or direct ERC-20 transfer is never accepted as live evidence.

## Legacy backend boundary

Several preserved legacy prototypes under `x402-server/src/contracts`, `src/facilitator`, `src/integrations`, and old routes contain incomplete placeholders and were already not part of the active `src/server.ts` runtime. The backend TypeScript build and lint scopes now target the active server and real x402 feature without deleting those files.
