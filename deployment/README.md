# Deployment

## Services

| Service | Directory | Runtime |
| :--- | :--- | :--- |
| Web UI | `web` | Cloudflare Worker `digirobotics-web` (Next.js 16 through OpenNext), live at `https://digirobotics.xyz` |
| x402 backend | `x402-server` | Cloudflare Worker `digirobotics-x402` running the Express app in one Durable Object, live at `https://x402.digirobotics.xyz` (Arbitrum Sepolia). A second Worker, `digirobotics-x402-robinhood`, serves Robinhood Chain Testnet at `https://x402-rh.digirobotics.xyz`. Local runs use Node.js `>=20.9` |

The x402 backend keeps runs and access-link signing state in memory, so Phase 1 must run as one persistent process. On Cloudflare every request is forwarded to a single Durable Object instance for that reason (`x402-server/wrangler.jsonc`). Do not deploy it to a horizontally scaled or frequently recycled environment without replacing the run and entitlement stores.

## Configuration and secrets

Use `x402-server/.env.example` and `web/.env.example` as schemas. Store `PRIVATE_KEY` and the other backend secrets only as Worker secrets (`wrangler secret put`). The web deployment receives `NEXT_PUBLIC_X402_BACKEND_URL` at build time, and the `/ops` secrets listed in `web/.dev.vars.example` as Worker secrets. Configure CORS and TLS at the deployment edge before public use.

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

## Deploy to Cloudflare Workers

```bash
cd x402-server
npm run worker:deploy

cd ../web
npm run deploy
```

## Release gate

Before deployment, confirm `GET /health` reports the intended mode (`REAL_MUSDG_X402` on the live server), confirm onchain token metadata, fund only the bounded test wallet, capture an unpaid 402, and complete one explicitly authorized testnet purchase. For the `REAL_X402_TEST_ASSET` mode only, also verify the public facilitator's `/supported` response still advertises x402 v2 `exact` for `eip155:84532`. See `x402-server/docs/AGENT_DEMO_RUNBOOK.md`.
