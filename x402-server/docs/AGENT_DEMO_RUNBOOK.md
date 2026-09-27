# DigiRobotics real x402 agent demo runbook

## Implementation mode

| Property | Value |
| :--- | :--- |
| Mode | `REAL_X402_TEST_ASSET` |
| Protocol | x402 v2, `exact`, EIP-3009 authorization |
| Network | Base Sepolia, chain `84532`, CAIP-2 `eip155:84532` |
| Asset | Test USDC, `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| EIP-712 domain | `name: USDC`, `version: 2`, both checked onchain before signing |
| Decimals | `6`, checked onchain before a run |
| Price | `0.05 USDC` (`50000` atomic units) |
| Facilitator | `https://x402.org/facilitator` |
| Seller | `0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331` |
| Buyer | Server-side EOA derived from `PRIVATE_KEY`; never sent to the browser |
| Explorer | `https://sepolia.basescan.org` |

The live settlement-evidence section must remain unfilled until a real paid run completes. A submitted or simulated transaction is not success.

## Compatibility decision

The preferred MockUSDG mode is incompatible with the selected public facilitator. MockUSDG is deployed on Arbitrum Sepolia at `0x39271d08C111912B1F32465745f3123a878C83Bb`, reports symbol `mUSDG` and `6` decimals, and inherits plain OpenZeppelin `ERC20`. It implements neither EIP-3009 nor EIP-2612. x402 v2 supports generic ERC-20 payments through Permit2, but the public facilitator's `/supported` response does not advertise Arbitrum Sepolia. A normal `transfer()` is not used as an x402 substitute.

The public facilitator advertises x402 v2 `exact` on Base Sepolia, and the installed x402 v2 EVM package identifies Base Sepolia test USDC as its EIP-3009 default asset. This selects `REAL_X402_TEST_ASSET`.

## Component responsibilities

| Component | Role in this demo |
| :--- | :--- |
| x402 | Builds the 402 requirements, signs the authorization, verifies it, and settles through the facilitator. |
| ZeroDev | Not used by this payment. The existing Kernel flow remains limited to the separate human mUSDG checkout. |
| Thirdweb | Not used by this payment. It remains the human checkout authentication/embedded-wallet provider. |
| CDP | Not used. The public x402 facilitator and existing backend signer are sufficient for Phase 1. |
| Permit2 | Supported by the installed SDK, but not used for Base Sepolia USDC; the selected path uses native EIP-3009. |
| Pinata | Existing upload integration is preserved. The demo serves an access-controlled local manifest with a five-minute HMAC URL; no public CID is disclosed. |
| Bazaar | Queried first through `@x402/extensions`; external auto-payment still requires an allowlisted host and `payTo`. |

## Environment

Copy `.env.example` to `.env`, retain all secrets only in `.env`, and configure the public x402 values shown above. Real `.env` files are ignored by Git. The server fails at startup when the signer, addresses, allowlists, or numeric bounds are invalid.

The default `AGENT_MAX_TOTAL_SPEND_ATOMIC=50000` reserves at most one `0.05 USDC` authorization for the lifetime of a server process, including failed or indeterminate attempts. This fail-closed demo budget prevents an unauthenticated public page from draining the signer through repeated runs. Restart only after inspecting any indeterminate settlement onchain.

The frontend needs only:

```dotenv
NEXT_PUBLIC_X402_BACKEND_URL=http://localhost:3001
```

No signer, facilitator credential, or privileged SDK belongs in `web/.env*`.

## Preflight and funding

Read the buyer address and balances without printing its private key:

```bash
cd x402-server
set -a
source .env
set +a

AGENT_ADDRESS="$(cast wallet address --private-key "$PRIVATE_KEY")"
cast balance "$AGENT_ADDRESS" --rpc-url "$X402_RPC_URL"
cast call "$X402_ASSET_ADDRESS" "decimals()(uint8)" --rpc-url "$X402_RPC_URL"
cast call "$X402_ASSET_ADDRESS" "name()(string)" --rpc-url "$X402_RPC_URL"
cast call "$X402_ASSET_ADDRESS" "version()(string)" --rpc-url "$X402_RPC_URL"
cast call "$X402_ASSET_ADDRESS" "balanceOf(address)(uint256)" "$AGENT_ADDRESS" --rpc-url "$X402_RPC_URL"
```

If funding is required, perform it separately from the **Run agent demo** button. The following is a normal test-token funding transfer and is not x402:

```bash
cast send "$X402_ASSET_ADDRESS" "transfer(address,uint256)" "$AGENT_ADDRESS" 1000000 \
  --private-key "$FUNDING_PRIVATE_KEY" \
  --rpc-url "$X402_RPC_URL"
```

The funding wallet needs Base Sepolia ETH for that transaction. Never place `FUNDING_PRIVATE_KEY` in the frontend.

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

## Prove the unpaid 402

```bash
curl -i \
  -H 'Accept: application/json' \
  http://localhost:3001/x402/datasets/engine-assembly-pov/content
```

Expected evidence includes `HTTP/1.1 402 Payment Required`, a `PAYMENT-REQUIRED` header, and a JSON body containing only `PAYMENT_REQUIRED`. Decode the header if needed:

```bash
curl -sS -D /tmp/digi-402-headers.txt \
  -H 'Accept: application/json' \
  http://localhost:3001/x402/datasets/engine-assembly-pov/content \
  -o /tmp/digi-402-body.json
```

The decoded requirement must contain `x402Version: 2`, `scheme: exact`, `network: eip155:84532`, `asset: 0x036C...CF7e`, `amount: 50000`, the configured seller, `assetTransferMethod: eip3009`, and EIP-712 domain `name: USDC`, `version: 2`. It must not contain a private storage reference or access URL.

## Run and verify a paid purchase

1. Confirm the backend preflight reports the expected buyer and at least `0.05 USDC`.
2. Open `/agent-demo` and select **Run agent demo** once.
3. Watch genuine SSE states progress from `queued` through `payment_required`, `validating_policy`, and `settling`.
4. Treat the run as successful only when its final status is `unlocked`, it contains a non-zero transaction hash, and the access response contains a short-lived URL.
5. Open `https://sepolia.basescan.org/tx/<TRANSACTION_HASH>` and confirm a successful Base Sepolia transaction.
6. Confirm the seller's USDC balance increased by exactly `50000` atomic units.
7. Open the signed dataset URL before its five-minute expiry and confirm the protected manifest is returned.

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

The live test is skipped by default with an explicit reason because it spends test USDC. Execute the user-approved purchase through the run API/UI and record its transaction evidence; never replace it with a mocked receipt.

## Recovery

| Failure | Recovery |
| :--- | :--- |
| Insufficient USDC | Fund the server-side buyer with the separate transfer command, then rerun preflight. The UI run never invokes a faucet. |
| Facilitator unavailable | Check `GET https://x402.org/facilitator/supported`; do not retry blindly after an indeterminate settlement timeout. Inspect the buyer nonce and explorer before another run. |
| Unsupported capability | Keep the mode blocked until `/supported` advertises x402 v2 `exact` for the exact network. Do not fall back to ERC-20 `transfer()`. |
| Expired access URL | A new paid purchase is required in the current demo. Production should persist entitlements and reissue links without charging twice. |
| Expired ZeroDev session key | Not applicable to this x402 payment. Rotate/revoke it only for the separate human checkout flow. |

## Known limitations

- Runs and entitlements are in memory and expire; multi-instance production needs a durable idempotency and entitlement store.
- Bazaar availability is optional. An allowed DigiRobotics resource is selected through the same interface when no external result passes policy.
- The access object is local demo data, not a private Pinata object. The signed URL is process-local and expires after five minutes.
- The configured seller is repository-documented and distinct from the buyer, but operational ownership on Base Sepolia must be confirmed before using anything other than valueless test assets.
- Base Sepolia, its RPC, the public facilitator, Circle's test token contract, and the hosted frontend can censor or observe requests.
