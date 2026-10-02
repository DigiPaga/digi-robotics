# Architecture and walkthrough

## Design decisions

| Decision | Rationale |
| :--- | :--- |
| Keep autonomous payment logic in `x402-server` | The browser never receives the buyer key or privileged payment SDK state. |
| Use `REAL_MUSDG_X402` on Arbitrum Sepolia and Robinhood Chain Testnet | MockUSDG implements EIP-3009 and no hosted facilitator serves these chains, so the server verifies in-process and settles through the `X402Facilitator` contract. `REAL_X402_TEST_ASSET` on Base Sepolia (test USDC, public facilitator) was the first path and remains as a local fallback. |
| Require the `upfront` payment flow | Facilitator settlement completes before the protected route handler issues access. |
| Use deterministic discovery and policy | The demo is reproducible and every spending condition is an explicit code boundary. |
| Keep runs in memory for Phase 1 | It is sufficient for a single demo process; production needs durable idempotency and entitlements. |

## Solution architecture

```text
Next.js /agent-demo
  └─ POST run + SSE status
       └─ Express agent orchestrator
            ├─ Bazaar-first discovery
            ├─ strict payment policy
            ├─ server-only EOA signer
            └─ x402 buyer client
                 ├─ unpaid GET → HTTP 402
                 └─ paid GET + PAYMENT-SIGNATURE
                      └─ x402 resource server
                           └─ in-process facilitator verify + settle
                                └─ X402Facilitator contract, MockUSDG (mUSDG)
```

The public catalog contains descriptions, prices, and resource URLs only. Protected storage references live in a server-only registry. Successful settlement produces a five-minute signed access URL; unpaid responses never contain that URL or the protected manifest.

## Agent walkthrough

1. `POST /agent-demo/runs` creates one idempotent run and returns immediately.
2. The backend checks onchain token name, symbol, decimals, EIP-712 version, EIP-3009 support, and buyer balance.
3. Discovery queries Bazaar first and then adds DigiRobotics resources through the same typed interface.
4. The highest-scoring allowlisted resource is requested without payment.
5. The genuine 402 terms are checked against exact network, asset, EIP-712 domain, transfer method, scheme, host, recipient, amount, decimals, timeout, redirect, and one-payment rules.
6. The backend signs the EIP-3009 payload and retries the same URL.
7. The resource server settles through the facilitator before its handler runs.
8. A successful receipt and onchain seller balance delta unlock the signed dataset URL.
9. The UI renders only events received through SSE and recovers terminal state through the status endpoint.

## CROPS review

Chosen default:

- A capped, allowlisted, server-side testnet agent using an in-process facilitator. This provides a truthful x402 demo with no browser signer exposure.

Censorship Resistance:

- Risk: the Arbitrum or Robinhood Chain sequencer, RPC, backend host, and frontend host can block the flow.
- Mitigation: protocol requests and contract addresses are documented; the SDK and app are self-hostable.
- User escape: operators can switch RPC/facilitator only after re-running the exact capability audit; token holders retain direct wallet access.

Open and Free:

- Risk: live infrastructure is hosted and vendor-dependent.
- Mitigation: application code, environment schema, protocol metadata, and run commands are in the MIT-licensed repository.
- User escape: fork and self-host the frontend/backend with a compatible facilitator.

Privacy:

- Risk: buyer, seller, amount, timing, and transaction are public; RPC/facilitator/backend see request metadata.
- Mitigation: no human identity is requested, secrets are server-only, and logs redact signing material.
- User escape: use a dedicated test wallet and self-hosted infrastructure; this demo does not promise transaction privacy.

Security:

- Risk: the backend EOA can spend its token balance and hosted services can fail during settlement.
- Mitigation: exact allowlists, a 50,000-atomic per-payment and process-lifetime cap, one purchase per run, bounded timeouts, no redirects, and onchain receipt/balance verification.
- User escape: remove funding or rotate the backend key. Production should replace the EOA with bounded wallet-level permissions and durable recovery.

Accepted compromises:

- Testnet assets, an in-process facilitator with a hot settlement key, an in-memory run store, and process-local access links are acceptable for the hackathon demo only.
