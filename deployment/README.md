# Deployment

## Services

| Service | Directory | Runtime |
| :--- | :--- | :--- |
| Web UI | `web` | Node.js with Next.js 16 |
| x402 backend | `x402-server` | Node.js `>=20.9`, persistent Express process |

The x402 backend keeps runs and access-link signing state in memory, so Phase 1 must run as one persistent process. Do not deploy it to a horizontally scaled or frequently recycled environment without replacing the run and entitlement stores.

## Configuration and secrets

Use `x402-server/.env.example` and `web/.env.example` as schemas. Store `PRIVATE_KEY` only in the backend platform's secret manager. The web deployment receives only `NEXT_PUBLIC_X402_BACKEND_URL`. Configure CORS and TLS at the deployment edge before public use.

## Build commands

```bash
cd x402-server
npm ci
npm run typecheck
npm test
npm run build
npm start
```

```bash
cd web
npm ci
npx tsc --noEmit
npm run lint
npm run build
npm start
```

## Release gate

Before deployment, verify the facilitator's `/supported` response still advertises x402 v2 `exact` for `eip155:84532`, confirm onchain token metadata, fund only the bounded test wallet, capture an unpaid 402, and complete one explicitly authorized testnet purchase. See `x402-server/docs/AGENT_DEMO_RUNBOOK.md`.
