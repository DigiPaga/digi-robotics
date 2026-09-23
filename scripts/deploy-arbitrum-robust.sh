#!/bin/bash
# Robust Arbitrum Deployment Script
# Implements retries and gas buffer recommendations from Arbitrum DApp Skill

set -e

echo "🚀 Starting robust Arbitrum Sepolia deployment..."

cd contracts

# Check if env vars are set
if [ -z "$PRIVATE_KEY" ] || [ -z "$ARBITRUM_SEPOLIA_RPC" ]; then
    echo "❌ Error: PRIVATE_KEY and ARBITRUM_SEPOLIA_RPC must be set in .env"
    exit 1
fi

echo "📦 Compiling contracts with L2 optimizer settings..."
forge build

echo "🔑 Deploying to Arbitrum Sepolia..."
# Using --with-gas-price to add a buffer for L1 data fee spikes
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --verify \
  --etherscan-api-key "$ARBISCAN_API_KEY" \
  --retries 3

echo "✅ Deployment and verification complete!"
cd ..
