# Stablecoin ecommerce demo

The capture-gear checkout and autonomous agent demo are separate payment rails. Human checkout uses a ZeroDev Kernel account to perform a direct mUSDG ERC-20 transfer on Arbitrum Sepolia. `/agent-demo` uses a server-side EOA and a genuine x402 v2 EIP-3009 payment in MockUSDG (`mUSDG`) on Arbitrum Sepolia or Robinhood Chain Testnet, settled through the `X402Facilitator` contract. A direct ERC-20 transfer is never described as x402.

## Real x402 agent demo

| Property | Value |
| :--- | :--- |
| UI | `/agent-demo` |
| Backend | `x402-server`, default `http://localhost:3001` |
| Mode | `REAL_MUSDG_X402` |
| Network | Arbitrum Sepolia (`421614`) on the live server; Robinhood Chain Testnet (`46630`) is also supported |
| Asset | MockUSDG (`mUSDG`, EIP-3009), `0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4` |
| Settlement contract | `X402Facilitator`, `0xB7D6F2aC244C8562CEd113AAf1a1A41C253FE816` |
| Price | `0.05 mUSDG` |
| Signer | Server-side EOA; not Thirdweb or ZeroDev |

`x402-server/.env.example` still defaults to the earlier `REAL_X402_TEST_ASSET` mode (Base Sepolia test USDC through the public x402.org facilitator), which remains available for local runs.

Set `NEXT_PUBLIC_X402_BACKEND_URL` in `web/.env.local`. It is the only agent-demo frontend variable. See `x402-server/docs/AGENT_DEMO_RUNBOOK.md` for the compatibility audit, server configuration, funding, 402 proof, and settlement verification.

## Deployed demo contract

| Property | Value |
| :--- | :--- |
| Network | Arbitrum Sepolia (`421614`) |
| Token | Mock USDG (Demo), `mUSDG` |
| Decimals | `6` |
| Contract | [`0x39271d08C111912B1F32465745f3123a878C83Bb`](https://sepolia.arbiscan.io/address/0x39271d08C111912B1F32465745f3123a878C83Bb) |
| Deployment transaction | [`0x9396115a76fdc62f77c2a07fdf52926072bd0a1fa2b3f482f684ab3c8749d1f0`](https://sepolia.arbiscan.io/tx/0x9396115a76fdc62f77c2a07fdf52926072bd0a1fa2b3f482f684ab3c8749d1f0) |
| Store wallet | [`0xB282276c54c6Cc9912A37c538fdD60a98a4EF5f1`](https://sepolia.arbiscan.io/address/0xB282276c54c6Cc9912A37c538fdD60a98a4EF5f1) |

This is the first MockUSDG, a plain ERC-20 without EIP-3009. Checkout falls back to it when neither `NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA` nor `NEXT_PUBLIC_MOCK_USDG_ADDRESS` is set at build time (`web/src/lib/stablecoinConfig.ts`). The x402 rail uses a second MockUSDG with EIP-3009 at `0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4`.

The store address is the checksum-valid address historically committed as both `DEPLOYER_ADDRESS` and `PAYMENT_RECIPIENT`. The token is a demo asset with a repeatable public faucet; it has no monetary value.

## Frontend configuration

Copy `web/.env.example` to `web/.env.local` and set the following values:

| Variable | Value or purpose |
| :--- | :--- |
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Thirdweb client ID with embedded wallets enabled. |
| `NEXT_PUBLIC_ZERODEV_PROJECT_ID` | ZeroDev project used for Kernel accounts and sponsorship. |
| `NEXT_PUBLIC_ZERODEV_RPC_URL` | Optional full ZeroDev bundler/paymaster URL. If omitted, the app derives the v3 URL from the project ID and chain. |
| `NEXT_PUBLIC_CHAIN_ID` | `421614` |
| `NEXT_PUBLIC_MOCK_USDG_ADDRESS` | `0x39271d08C111912B1F32465745f3123a878C83Bb` |
| `NEXT_PUBLIC_STORE_WALLET_ADDRESS` | `0xB282276c54c6Cc9912A37c538fdD60a98a4EF5f1` |

The code contains the deployed demo addresses as safe fallbacks, but explicit environment values are recommended for reviewable deployments.

## ZeroDev sponsorship policy

In the ZeroDev dashboard, enable Arbitrum Sepolia and configure the paymaster policy to allow calls only to the deployed mUSDG contract.

| Target | Selector | Purpose |
| :--- | :--- | :--- |
| `0x39271d08C111912B1F32465745f3123a878C83Bb` | `0x3ccfd60b` | `faucet()` mints 1,000 demo mUSDG to the calling smart account. |
| `0x39271d08C111912B1F32465745f3123a878C83Bb` | `0xa9059cbb` | `transfer(address,uint256)` pays the fixed store wallet. |

Do not use an unrestricted sponsorship rule. Apply a per-wallet or per-day operation limit suitable for a public demo. If ZeroDev refuses an operation, checkout surfaces a sponsorship-specific error and leaves the cart intact.

## Deploy a fresh MockUSDG

The Foundry script reads `PRIVATE_KEY` from the environment. The project keeps the local deployment variables in `x402-server/.env`; never print, copy into client code, or commit that file.

```bash
cd contracts
set -a
source ../x402-server/.env
set +a

forge test --match-path test/MockUSDG.t.sol -vvv
forge script script/DeployMockUSDG.s.sol:DeployMockUSDGScript \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC" \
  --broadcast \
  --verify \
  --etherscan-api-key "$ETHERSCAN_API_KEY"
```

If the configured RPC returns an authentication error, replace `ARBITRUM_SEPOLIA_RPC` with a working authenticated endpoint or use Arbitrum’s public testnet endpoint for the deployment:

```bash
export ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
```

After deployment, update both the frontend environment and the ZeroDev target allowlist. Verify the source if the combined deploy-and-verify step did not complete:

```bash
forge verify-contract \
  --chain-id 421614 \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  <DEPLOYED_ADDRESS> \
  src/MockUSDG.sol:MockUSDG
```

## Run and verify the demo

```bash
cd web
npm install
npm run dev
```

1. Open `/gear` and add an in-stock item.
2. Open the cart and enter simulated shipping details.
3. Connect a Thirdweb email or Google embedded wallet and switch to Arbitrum Sepolia.
4. Select **Fund wallet**. The sponsored `faucet()` operation mints 1,000 mUSDG to the derived Kernel account.
5. Pay the cart total. Checkout performs a direct ERC-20 `transfer` to the store wallet and waits for the included transaction hash.
6. Confirm the transaction on Arbiscan and open `/orders`. Sign the read-only ownership message to load that wallet’s order history.

`POST /api/orders` verifies the wallet signature and the expected mUSDG `Transfer` log before writing the order. `GET /api/orders` requires a wallet signature and omits shipping details from its response.

## Demo boundaries

- `web/data/orders.json` is intentionally lightweight, single-instance storage for local runs; the Cloudflare deployment stores orders in the D1 database bound as `ORDERS_DB` (`web/wrangler.jsonc`). Serverless or horizontally scaled production deployment needs durable storage and coordinated writes.
- Shipping is simulated. No carrier, warehouse, drop-shipper, email service, admin panel, escrow, or refund workflow is connected.
- The public faucet is intentionally repeatable and must never be presented as a real stablecoin.
- Shipping data is stored unencrypted in the local JSON file for the demo. Use encrypted, access-controlled storage with a retention policy before collecting real personal data.
