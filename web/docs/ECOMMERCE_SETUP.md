# Stablecoin ecommerce demo

The capture-gear checkout is the human-facing counterpart to DigiRobotics’ x402 rail. An autonomous client receives an HTTP 402 challenge and satisfies it programmatically; a person instead sees a cart, shipping form, wallet balance, and confirmation screen. Both flows demonstrate programmable payment settlement, while this demo intentionally simulates physical fulfillment.

## Deployed demo contract

| Property | Value |
| :--- | :--- |
| Network | Arbitrum Sepolia (`421614`) |
| Token | Mock USDG (Demo), `mUSDG` |
| Decimals | `6` |
| Contract | [`0x39271d08C111912B1F32465745f3123a878C83Bb`](https://sepolia.arbiscan.io/address/0x39271d08C111912B1F32465745f3123a878C83Bb) |
| Deployment transaction | [`0x9396115a76fdc62f77c2a07fdf52926072bd0a1fa2b3f482f684ab3c8749d1f0`](https://sepolia.arbiscan.io/tx/0x9396115a76fdc62f77c2a07fdf52926072bd0a1fa2b3f482f684ab3c8749d1f0) |
| Store wallet | [`0xB282276c54c6Cc9912A37c538fdD60a98a4EF5f1`](https://sepolia.arbiscan.io/address/0xB282276c54c6Cc9912A37c538fdD60a98a4EF5f1) |

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

- `web/data/orders.json` is intentionally lightweight, single-instance storage. Serverless or horizontally scaled production deployment needs durable storage and coordinated writes.
- Shipping is simulated. No carrier, warehouse, drop-shipper, email service, admin panel, escrow, or refund workflow is connected.
- The public faucet is intentionally repeatable and must never be presented as a real stablecoin.
- Shipping data is stored unencrypted in the local JSON file for the demo. Use encrypted, access-controlled storage with a retention policy before collecting real personal data.
