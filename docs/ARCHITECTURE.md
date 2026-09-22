# System Architecture

## Overview

DigiPaga Marketplace is a dual-rail platform connecting AI agents and humans through blockchain-based commerce.

## Components

### 1. x402 Payment Server
- **Technology**: Node.js + Express + TypeScript
- **Purpose**: Handle HTTP 402 payment required responses
- **Key Features**:
  - Signature verification (EIP-712)
  - Agent identity validation (ERC-8004)
  - IPFS asset delivery
  - Multi-chain settlement

### 2. Smart Contracts
- **Framework**: Foundry (Solidity)
- **Contracts**:
  - AgentRegistry (ERC-8004)
  - RoboticsMarketplace
  - AssetVault
  - X402Facilitator

### 3. Frontend
- **Framework**: Next.js 14
- **Web3**: Wagmi + Viem
- **AA**: ZeroDev SDK

## Data Flow

1. **Agent Request** → x402 Server
2. **402 Response** → Payment Details
3. **Signature** → EIP-712 Authorization
4. **Verification** → Smart Contract
5. **Settlement** → USDC Transfer
6. **Delivery** → IPFS Asset

## Security

- Signature verification
- Nonce management
- Deadline enforcement
- Rate limiting
- CORS policies
