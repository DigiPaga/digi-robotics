# DigiRobotics mUSDG x402 agent demo runbook

## Implementation mode

| Property | Value |
| :--- | :--- |
| Mode | `REAL_MUSDG_X402` |
| Protocol | x402 v2, `exact`, Permit2 authorization for a standard ERC-20 |
| Network | Arbitrum Sepolia, chain `421614`, CAIP-2 `eip155:421614` |
| Asset | MockUSDG (`mUSDG`), `0x39271d08C111912B1F32465745f3123a878C83Bb` |
| Decimals | `6`, verified onchain before a run |
| Price | `0.05 mUSDG` (`50000` atomic units) |
| Facilitator | Configured x402 v2 facilitator with `exact` Permit2 support on `eip155:421614` |
| Buyer | Server-side signer derived from `PRIVATE_KEY`; never sent to the browser |
| Seller | Configured `X402_PAY_TO`, distinct from the buyer and explicitly allowlisted |
| Explorer | `https://sepolia.arbiscan.io` |

The demo uses the configured mUSDG deployment on Arbitrum Sepolia. A run is valid only when the selected facilitator advertises the exact network, asset-transfer method, and settlement capability required for this configuration. If those capabilities are unavailable, the backend must report `BLOCKED`; it must never substitute a normal ERC-20 transfer and describe it as x402.

## Compatibility decision

MockUSDG is deployed on Arbitrum Sepolia at `0x39271d08C111912B1F32465745f3123a878C83Bb`, reports symbol `mUSDG`, uses `6` decimals, and is a standard OpenZeppelin ERC-20 with a public testnet faucet. It does not implement native EIP-3009 or EIP-2612 authorization.

The x402 payment flow therefore adapts to the available testnet infrastructure through Permit2:

1. Query the configured facilitator's supported capabilities.
2. Require x402 v2 `exact` support for `eip155:421614` and Permit2 settlement.
3. Confirm the buyer has sufficient mUSDG balance and Permit2 allowance before launch.
4. Sign the x402 Permit2 authorization on the server.
5. Retry the protected HTTP resource with the x402 payment header.
6. Unlock content only after facilitator verification and successful Arbitrum Sepolia settlement.

If any capability or allowance is missing, stop before signing and return an actionable blocked status.

## Component responsibilities

| Component | Role in this demo |
| :--- | :--- |
| x402 | Produces the HTTP 402 requirements, constructs the authorization, verifies payment, and coordinates settlement. |
| Permit2 | Provides the authorization path for mUSDG because MockUSDG has no native EIP-3009 support. |
| Facilitator | Must advertise and settle x402 v2 `exact` Permit2 payments on Arbitrum Sepolia. |
| ZeroDev | Remains the smart-account provider for the separate human checkout unless explicitly wired into the x402 signer. |
| Thirdweb | Remains the human authentication and embedded-wallet provider; it is not the server-side x402 signer. |
| Pinata | Existing upload support is preserved. The demo returns a five-minute signed local manifest URL only after settlement. |
| Bazaar | Discovery is attempted first; external resources are never paid unless host, network, asset, and recipient are allowlisted. |

## Environment

Keep secrets only in `x402-server/.env`; real environment files are ignored by Git. The server must fail closed when the signer, addresses, allowlists, numeric bounds, or chain configuration are invalid.

Use the following public configuration values:

```dotenv
X402_MODE=REAL_MUSDG_X402
X402_NETWORK=eip155:421614
X402_CHAIN_ID=421614
X402_RESOURCE_BASE_URL=http://localhost:3001
X402_ASSET_ADDRESS=0x39271d08C111912B1F32465745f3123a878C83Bb
X402_ASSET_NAME=Mock USDG
X402_ASSET_SYMBOL=mUSDG
X402_ASSET_DECIMALS=6
X402_PRICE_DISPLAY=0.05
X402_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
AGENT_MAX_SPEND_ATOMIC=50000
AGENT_MAX_TOTAL_SPEND_ATOMIC=50000
AGENT_ALLOWED_HOSTS=localhost:3001
AGENT_REQUEST_TIMEOUT_MS=30000
AGENT_MAX_CONCURRENT_RUNS=1
```

Set `X402_FACILITATOR_URL`, `X402_PAY_TO`, and `AGENT_ALLOWED_PAY_TO` to reviewed values. The seller must differ from the buyer. Do not start a paid run until the facilitator capability response confirms Arbitrum Sepolia and the configured Permit2 path.

The frontend needs only:

```dotenv
NEXT_PUBLIC_X402_BACKEND_URL=http://localhost:3001
```

No signer, facilitator credential, or privileged SDK belongs in `web/.env*`.

The default process-lifetime budget permits at most one `0.05 mUSDG` authorization per server process, including failed or indeterminate attempts. Restart only after inspecting the previous authorization and settlement state onchain.

## Preflight and funding

Read the buyer address, token metadata, balance, and Permit2 allowance without printing its private key:

```bash
cd x402-server
set -a
source .env
set +a

AGENT_ADDRESS="$(cast wallet address --private-key "$PRIVATE_KEY")"
cast balance "$AGENT_ADDRESS" --rpc-url "$X402_RPC_URL"
cast call "$X402_ASSET_ADDRESS" "name()(string)" --rpc-url "$X402_RPC_URL"
cast call "$X402_ASSET_ADDRESS" "symbol()(string)" --rpc-url "$X402_RPC_URL"
cast call "$X402_ASSET_ADDRESS" "decimals()(uint8)" --rpc-url "$X402_RPC_URL"
cast call "$X402_ASSET_ADDRESS" "balanceOf(address)(uint256)" "$AGENT_ADDRESS" --rpc-url "$X402_RPC_URL"
cast call "$X402_ASSET_ADDRESS" "allowance(address,address)(uint256)" "$AGENT_ADDRESS" "$PERMIT2_ADDRESS" --rpc-url "$X402_RPC_URL"
```

MockUSDG provides a public testnet faucet. Funding is separate from x402 and must never be reported as a purchase:

```bash
cast send "$X402_ASSET_ADDRESS" "faucet()" \
  --private-key "$PRIVATE_KEY" \
  --rpc-url "$X402_RPC_URL"
```

The wallet needs Arbitrum Sepolia ETH for faucet or approval transactions. Approve only the reviewed Permit2 contract and cap the allowance to the smallest practical demo amount.

## Start the demo

```bash
# Terminal 1
cd x402-server
npm install
npm run dev

# Terminal 2
cd web
npm install
npm run dev
```

Open `http://localhost:3000/agent-demo`.

## Prove the unpaid HTTP 402

```bash
curl -i \
  -H 'Accept: application/json' \
  http://localhost:3001/x402/datasets/engine-assembly-pov/content
```

Expected evidence includes `HTTP/1.1 402 Payment Required`, a `PAYMENT-REQUIRED` header, and a JSON body containing only the public payment error. The decoded requirement must contain:

| Field | Required value |
| :--- | :--- |
| `x402Version` | `2` |
| `scheme` | `exact` |
| `network` | `eip155:421614` |
| `asset` | `0x39271d08C111912B1F32465745f3123a878C83Bb` |
| `amount` | `50000` |
| transfer method | `permit2` |
| `payTo` | Configured allowlisted seller |

The unpaid response must not contain a storage reference, signed URL, private gateway URL, or protected manifest.

## Run and verify a paid purchase

1. Confirm the facilitator advertises x402 v2 `exact` Permit2 settlement for `eip155:421614`.
2. Confirm the buyer has at least `0.05 mUSDG`, sufficient Arbitrum Sepolia ETH for any required approval, and the expected Permit2 allowance.
3. Open `/agent-demo` and select **Run agent demo** once.
4. Watch backend-generated SSE states progress from `queued` through `payment_required`, `validating_policy`, and `settling`.
5. Treat the run as successful only when its final state is `unlocked`, it includes a non-zero transaction hash, and the response contains a short-lived access URL.
6. Open `https://sepolia.arbiscan.io/tx/<TRANSACTION_HASH>` and confirm a successful Arbitrum Sepolia transaction.
7. Confirm the seller's mUSDG balance increased by exactly `50000` atomic units.
8. Open the signed dataset URL before its five-minute expiry and confirm the protected manifest is returned.

## Tests

```bash
cd x402-server
npm run typecheck
npm run lint
npm test
npm run build

cd ../web
npx tsc --noEmit
npm run lint
npm run build
```

The live settlement test must remain skipped unless valid facilitator capability, signer funding, Permit2 allowance, and explicit spend approval are available. Never treat a simulated receipt, faucet call, approval, or direct transfer as a passing x402 purchase.

## Recovery

| Failure | Recovery |
| :--- | :--- |
| Insufficient mUSDG | Fund the server-side buyer with the separate faucet command, then repeat preflight. |
| Missing Permit2 allowance | Approve only the reviewed Permit2 contract with a bounded amount, then verify the allowance onchain. |
| Facilitator unavailable | Inspect the facilitator capability endpoint and any indeterminate authorization on Arbiscan before restarting. |
| Unsupported Arbitrum capability | Keep the mode blocked until the facilitator supports the exact Arbitrum Sepolia Permit2 route. Do not fall back to `transfer()`. |
| Expired access URL | Reissue an entitlement without charging again in production; the current in-memory demo requires operator recovery. |
| Expired ZeroDev session key | Rotate or revoke it only for the separate human checkout unless ZeroDev is explicitly integrated into the x402 signer. |

## Known limitations

- Runs, spend reservations, and entitlements are process-local; multi-instance production needs durable idempotency and entitlement storage.
- A compatible Arbitrum Sepolia x402 facilitator is an external operational dependency and must be verified before every live demo.
- MockUSDG is a faucet-backed test token with no monetary value.
- Permit2 requires a separate bounded approval transaction before its first use.
- The protected object is a local demo manifest rather than a private Pinata object.
- Buyer, seller, amount, and settlement activity are publicly visible on Arbitrum Sepolia.
- RPC, facilitator, sequencer, backend, and frontend operators can observe or censor requests.
