# Arbitrum DApp Development Guidelines

This project follows the [Arbitrum DApp Skill](https://github.com/hummusonrails/arbitrum-dapp-skill) best practices for Layer 2 development.

## 1. Gas Optimization for L2 (Nitro Stack)
Arbitrum charges gas for both L2 execution and L1 calldata. We optimize for this by:
- **Packing Structs**: Minimizing storage slots in `AgentRegistry` and `RoboticsMarketplace`.
- **Event-Heavy Architecture**: Storing large metadata (like IPFS URIs) in events rather than storage where possible, as event calldata is cheaper.
- **Avoiding SLOAD/SSTORE in Loops**: Caching state variables before iteration.

## 2. Retryable Tickets & L1->L2 Messaging
While our current x402 flow is L2-native, future versions bridging from Ethereum Mainnet will implement:
- Automatic retryable ticket creation via `L1ERC20Gateway`.
- Fallback mechanisms for auto-redeem failures using `forceExecuteRetryable`.

## 3. RPC & Node Resilience
- We use Alchemy's Arbitrum Sepolia endpoints with automatic fallback to public RPCs (`https://sepolia-rollup.arbitrum.io/rpc`).
- Gas estimation includes a 20% buffer to account for Arbitrum's dynamic L1 data fee fluctuations.

## 4. Contract Verification
Contracts are verified on Arbiscan using Foundry's `--verify` flag with the Etherscan V2 API compatibility layer.

## 5. Testing Strategy
- Unit tests run locally via Anvil.
- Integration tests fork the actual Arbitrum Sepolia state to ensure compatibility with real network conditions (e.g., actual USDC contract behavior).
