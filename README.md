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

```text
Next.js /agent-demo → Express run API + SSE → deterministic discovery/policy
                                              ↓
                                 server-only x402 EIP-3009 buyer
                                              ↓
protected resource ← HTTP 402 / paid retry → public facilitator → Base Sepolia USDC
       ↓ only after confirmed settlement
five-minute signed dataset URL
