# x402 server on Cloudflare Workers

The x402 server runs as two parallel Workers built from the same code and `wrangler.jsonc`. Each one is a separate deployment with its own Durable Object, so agent runs, rate limits and the demo spend budget are never shared between chains.

| | Arbitrum Sepolia | Robinhood Chain Testnet |
| :--- | :--- | :--- |
| Wrangler environment | top level (no `--env`) | `env.robinhood` |
| Worker | `digirobotics-x402` | `digirobotics-x402-robinhood` |
| Domain (custom domain) | `x402.digirobotics.xyz` | `x402-rh.digirobotics.xyz` |
| Network | `eip155:421614` | `eip155:46630` |
| MockUSDG (`X402_ASSET_ADDRESS`) | `0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4` | `0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4` |
| X402Facilitator (`X402_SETTLEMENT_CONTRACT`) | `0xB7D6F2aC244C8562CEd113AAf1a1A41C253FE816` | `0xB7D6F2aC244C8562CEd113AAf1a1A41C253FE816` |
| Deployment record | `contracts/deployments/x402-421614.json` | `contracts/deployments/x402-46630.json` |
| Explorer | `https://sepolia.arbiscan.io` | `https://explorer.testnet.chain.robinhood.com` |
| Deploy | `npm run worker:deploy` | `npm run worker:deploy:robinhood` |
| Local dev (BLOCKED mode) | `npm run worker:dev` | `npm run worker:dev:robinhood` |
| Web build variable | `NEXT_PUBLIC_X402_BACKEND_URL` | `NEXT_PUBLIC_X402_BACKEND_URL_ROBINHOOD` |

Chain id and RPC come from `X402_NETWORK` (`src/x402/chains.ts`); set `X402_RPC_URL` only to use another RPC. All the non-secret settings live in `wrangler.jsonc`. The deploy and dev scripts set `WRANGLER_BUILD_PLATFORM=node`; calling `wrangler` directly without it produces a bundle that fails while it loads.

## Secrets

Both Workers require the same four secrets, and `wrangler deploy` refuses to upload a Worker that lacks any of them. They are set per Worker: secrets of `digirobotics-x402` are not visible to `digirobotics-x402-robinhood`.

| Secret | What it is | Funding on Robinhood Chain Testnet |
| :--- | :--- | :--- |
| `PRIVATE_KEY` | Buyer agent key | mUSDG only (EIP-3009 is gasless for the payer); `faucet()` on MockUSDG once a day |
| `X402_FACILITATOR_PRIVATE_KEY` | Settlement signer, an approved settler on X402Facilitator | Native ETH for settlement gas |
| `X402_PAY_TO` | Treasury EOA that receives payments | None |
| `AGENT_ALLOWED_PAY_TO` | Payees the agent may pay; must include `X402_PAY_TO` | None |

The settler hot key `0xd98aC3064B36dFb19b62558d48cB16f00105F473` is approved on the X402Facilitator of both chains, so the same values can serve both Workers. If you use another settler key on Robinhood Chain Testnet, approve it first with `setSettler` from the owner key.

Upload the secrets with the first deploy, from a file outside the repository (dotenv format, see `.dev.vars.example`):

```bash
cd x402-server
npm run worker:deploy:robinhood -- --secrets-file /path/outside/repo/robinhood.secrets
```

or one at a time:

```bash
npx wrangler secret put PRIVATE_KEY --env robinhood
npx wrangler secret put X402_FACILITATOR_PRIVATE_KEY --env robinhood
npx wrangler secret put X402_PAY_TO --env robinhood
npx wrangler secret put AGENT_ALLOWED_PAY_TO --env robinhood
```

## Domain

`x402-rh.digirobotics.xyz` is a custom domain route. On deploy Wrangler creates its DNS record and certificate in the `digirobotics.xyz` zone of the DigiPaga account; nothing is set up by hand. The deploy fails if a DNS record for that hostname already exists, so remove any stale one first.

## Deploy the Robinhood Chain Testnet Worker

```bash
cd x402-server
npm ci
npm test && npm run lint && npm run typecheck && npm run typecheck:worker
WRANGLER_BUILD_PLATFORM=node npx wrangler deploy --env robinhood --dry-run --outdir /tmp/x402-rh   # bundle only, uploads nothing
npm run worker:deploy:robinhood -- --secrets-file /path/outside/repo/robinhood.secrets
```

Check it:

```bash
curl -s https://x402-rh.digirobotics.xyz/health
curl -s https://x402-rh.digirobotics.xyz/agent-demo/compatibility   # selectedAsset.network is eip155:46630
curl -si https://x402-rh.digirobotics.xyz/x402/datasets/engine-assembly-pov/content | head -1   # HTTP 402
```

A `503 SERVER_NOT_CONFIGURED` response names the setting at fault (never its value), usually a missing secret.

Then make it selectable in the web app: set `NEXT_PUBLIC_X402_BACKEND_URL_ROBINHOOD=https://x402-rh.digirobotics.xyz` in `web/.env.production.local` and rebuild and deploy the web app (Next.js inlines `NEXT_PUBLIC_*` at build time). Until then `/agent-demo` lists Robinhood Chain Testnet as "Not configured". `/agent-demo?chain=robinhood-testnet` opens the demo on Robinhood directly.

## Local development

`npm run worker:dev:robinhood` serves the Robinhood configuration on `http://localhost:8787` in BLOCKED mode, so it answers the catalog and compatibility routes without keys. Wrangler reads `.dev.vars.robinhood` for this environment, or `.dev.vars` when that file does not exist; only `X402_PAY_TO` and `AGENT_ALLOWED_PAY_TO` are needed. Point the web app at it with `NEXT_PUBLIC_X402_BACKEND_URL_ROBINHOOD=http://localhost:8787`.

For a real local run on Robinhood Chain Testnet without Workers, use the Node server (`npm run dev`) with `X402_MODE=REAL_MUSDG_X402`, `X402_NETWORK=eip155:46630` and the addresses above in `.env`.
