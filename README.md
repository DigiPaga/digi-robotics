# DigiRobotics: Agentic Commerce for Physical AI

![Autonomous Commerce](https://raw.githubusercontent.com/DigiPaga/digi-robotics/refs/heads/main/web/public/pitch-deck/slide-01-autonomous-commerce.jpg)

> **The first Egocentric Capture Marketplace powered by Stablecoins and the x402 Protocol.**  
> Built for the **Arbitrum Open House Singapore Buildathon**.

[![Arbitrum](https://img.shields.io/badge/Arbitrum-Foundation-2D3748?style=for-the-badge&logo=arbitrum&logoColor=white)](https://arbitrum.io)
[![Robinhood](https://img.shields.io/badge/Robinhood-Chain-00C805?style=for-the-badge&logo=robinhood&logoColor=white)](https://robinhood.com/us/en/crypto/chain/)
[![Paxos](https://img.shields.io/badge/Paxos-USDG/PYUSD-00522C?style=for-the-badge&logo=paxos&logoColor=white)](https://paxos.com)
[![ZeroDev](https://img.shields.io/badge/ZeroDev-ERC--4337-6366F1?style=for-the-badge&logo=zerodev&logoColor=white)](https://zerodev.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 🚀 Real x402 Agent Demo

The `/agent-demo` route proves a complete, production-grade **x402 v2** cycle on Base Sepolia:
1. An unpaid request receives a machine-readable **HTTP 402 Payment Required**.
2. A deterministic server-side agent validates strict spend policies.
3. The agent signs an **EIP-3009** (`transferWithAuthorization`) + **EIP-712** authorization for `0.05` test USDC.
4. The agent retries the resource; the public x402 facilitator verifies and settles the payment on-chain.
5. Only after confirmed settlement does the server issue a short-lived, signed URL to the protected robotics dataset.

*(Note: The human checkout flow remains a direct ERC-20 mUSDG transfer on Arbitrum Sepolia, demonstrating our dual-rail architecture.)*

📖 **Full Runbook:** [`x402-server/docs/AGENT_DEMO_RUNBOOK.md`](x402-server/docs/AGENT_DEMO_RUNBOOK.md)

---

## 📋 Table of Contents
- [Problem](#-problem)
- [Solution](#-solution)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [How It Works: The x402 Flow](#-how-it-works-the-x402-flow)
- [Tech Stack](#-tech-stack)
- [Smart Contracts](#-smart-contracts)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Sponsors & Integrations](#-sponsors--integrations)
- [Team](#-team)

---

## 🔥 Problem

Traditional marketplaces require human intervention for every transaction, creating friction and limiting scalability. AI agents, autonomous systems, and decentralized applications lack a native, trustless mechanism to:
- **Purchase digital assets** without human approval workflows.
- **Execute micro-payments** efficiently across multiple chains.
- **Access gated content** programmatically and securely.

The result? Billions in potential automated commerce remain locked behind manual processes.

---

## 💡 Solution

**DigiRobotics** exposes two deliberately separate, optimized rails:
1. **Agentic Commerce:** A real x402 v2 `exact` purchase on Base Sepolia test USDC, using a server-side EOA and the public x402 facilitator for trustless, machine-to-machine settlement.
2. **Human Checkout:** A frictionless Thirdweb/ZeroDev embedded wallet experience with direct mUSDG transfers on Arbitrum Sepolia, requiring no seed phrases.

---

## 🌟 Key Features

### For AI Agents
- ✅ **x402 Native Payments:** HTTP 402 status codes + EIP-3009/EIP-712 signatures for trustless micro-payments.
- ✅ **Strict Spend Policy:** Exact network, token, domain, recipient, host, amount, timeout, and one-payment enforcement.
- ✅ **Settlement Evidence:** Facilitator receipt, on-chain transaction receipt, and exact seller balance delta verification.
- ✅ **Protected Delivery:** No access URL is issued before successful on-chain settlement.

### For Humans
- ✅ **Zero-Friction Onboarding:** Instant embedded wallets via ZeroDev (no seed phrases).
- ✅ **Stablecoin Payouts:** Instant earnings in USDG/PYUSD for capturing egocentric data.
- ✅ **Dual-Rail Discovery:** Visual marketplace with filtering, search, and curation.

### For Developers
- ✅ **Foundry-Based:** Fastest smart contract development, testing, and deployment.
- ✅ **Type-Safe:** Full TypeScript stack from contracts to frontend.
- ✅ **Modular Architecture:** Clean separation of concerns, easy to extend.

---

## 🏗️ Architecture

```mermaid
graph TD
    A[Next.js /agent-demo] -->|Request Dataset| B(Express run API + SSE)
    B -->|Deterministic discovery/policy| C[Server-only x402 EIP-3009 Buyer]
    C -->|1. Unpaid GET| D{Protected Resource}
    D -->|2. HTTP 402 Payment Required| C
    C -->|3. Retry with PAYMENT-SIGNATURE header| D
    D -->|4. Verify & Forward| E[Public Facilitator]
    E -->|5. Settle On-Chain| F((Base Sepolia USDC))
    F -->|6. Confirmed Settlement Receipt| D
    D -->|7. Issue 5-min signed URL| C
    C -->|8. Return Data| B
    B -->|9. Display to User| A
    
    style F fill:#2D3748,stroke:#fff,stroke-width:2px,color:#fff
    style E fill:#00522C,stroke:#fff,stroke-width:2px,color:#fff
    style C fill:#6366F1,stroke:#fff,stroke-width:2px,color:#fff

---

🔄 How It Works: The x402 Flow
Preflight: The run API performs token/domain/balance preflight and deterministic discovery.
Challenge: The agent requests GET /x402/datasets/:id/content without payment and receives a machine-readable x402 v2 HTTP 402.
Authorization: Policy validates every payment field, then the server-side EOA signs one EIP-3009 authorization.
Settlement: The agent retries the same URL with the PAYMENT-SIGNATURE header; the public facilitator verifies and settles it on-chain.
Fulfillment: The server checks the receipt and seller balance delta, then issues a five-minute signed dataset URL.
🛠️ Tech Stack
Layer
Technologies
Smart Contracts
Foundry, Solidity 0.8.20, EIP-712, EIP-3009, ERC-8004
Backend
Node.js 20.x, Express.js, TypeScript, x402 v2.27
Frontend
Next.js 16 (App Router), React 19, Tailwind CSS 4
Web3 & AA
Viem, Wagmi v2, ZeroDev SDK (ERC-4337 Session Keys)
Infrastructure
QuickNode RPC, Pinata (IPFS), Dune Analytics, GitHub Actions
📜 Smart Contracts
Active Demo Contracts
Network
Contract
Purpose
Base Sepolia
Public Facilitator
x402 v2 payment settlement and verification
Base Sepolia
Test USDC
EIP-3009 transferWithAuthorization token
Legacy/Prototype Contracts (Preserved)
Contract
Purpose
Chain
AgentRegistry
ERC-8004 agent identity management
Arbitrum Sepolia, RH Testnet
RoboticsMarketplace
Asset listing and purchase logic
Arbitrum Sepolia, RH Testnet
AssetVault
Escrow and IPFS delivery
Arbitrum Sepolia, RH Testnet
🚀 Getting Started
Prerequisites
Node.js: v20.x or higher
Foundry: Install Guide
Git: v2.x or higher
Installation
bash
12345678
Running Locally
bash
12345
Access the demo at: http://localhost:3000/agent-demo
📁 Project Structure
text
123456789
🏆 Sponsors & Integrations
This project is built leveraging the best Web3 infrastructure, with special thanks to our hackathon sponsors:
Sponsor
Contribution
Arbitrum
L2 Scaling & Buildathon Host
Robinhood Chain
Testnet Infrastructure
Paxos
USDG/PYUSD Stablecoin Settlement
ZeroDev
ERC-4337 Account Abstraction
QuickNode
High-Performance RPC Nodes
Dune Analytics
On-chain Marketplace Metrics
👥 Team
Built by the DigiPaga Team for the Arbitrum Open House Singapore Buildathon
Oscar (@ozkite) - Smart Contracts & Backend
Otto (@ottodevs) - Frontend & Integration
🎓 ETHSKILLS Integration
This project follows ETHSKILLS guidelines for production-grade Ethereum development, with specific optimizations for Arbitrum's L2 gas dynamics and sequencer behavior.
Core Principles Applied:
✅ Security First: All contracts audited against common vulnerabilities (Reentrancy, Access Control).
✅ Gas Optimization: Efficient storage packing and computation patterns tailored for L2.
✅ Testing Coverage: Comprehensive unit, fuzz, and invariant tests with Foundry.
✅ Documentation: NatSpec comments and inline explanations throughout.
Tools Used:
Foundry: Testing, fuzzing, and deployment.
OpenZeppelin: Battle-tested contract libraries.
ZeroDev: Account Abstraction (ERC-4337) for AI agent Session Keys and gasless human onboarding.
<div align="center">
<strong>Built with ❤️ for the future of autonomous commerce.</strong><br/>
<em>Submission Date: October 4, 2026 | Prize Pool: $115,000 USD</em>
</div>
