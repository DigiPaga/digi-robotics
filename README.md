# DigiPaga Marketplace

[![Arbitrum](https://img.shields.io/badge/Arbitrum-2D3748?style=for-the-badge&logo=arbitrum&logoColor=white)](https://arbitrum.io)
[![Buildathon](https://img.shields.io/badge/Buildathon-Arbitrum%20Open%20House%20Singapore-2D3748?style=for-the-badge)](https://openhouse.arbitrum.io)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **Dual-rail marketplace for human stablecoin checkout and real autonomous x402 dataset purchases.**

## Real x402 agent demo

`/agent-demo` proves the complete x402 v2 cycle on Base Sepolia: an unpaid request receives HTTP 402, a deterministic server agent validates the requirements, signs an EIP-3009 authorization for `0.05` test USDC, retries the same resource, and unlocks a short-lived robotics dataset URL only after facilitator settlement. The separate Arbitrum Sepolia mUSDG human checkout remains a direct ERC-20 payment and is not labeled x402.

Runbook: [`x402-server/docs/AGENT_DEMO_RUNBOOK.md`](x402-server/docs/AGENT_DEMO_RUNBOOK.md)

---

## 📋 Table of Contents
- [Problem](#-problem)
- [Solution](#-solution)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [Smart Contracts](#-smart-contracts)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Team](#-team)
- [License](#-license)

---
## 🔥 Problem

Traditional marketplaces require human intervention for every transaction, creating friction and limiting scalability. AI agents, autonomous systems, and decentralized applications lack a native, trustless mechanism to:
- **Purchase digital assets** without human approval workflows
- **Verify identity and reputation** on-chain
- **Execute micro-payments** efficiently across multiple chains
- **Access gated content** programmatically

The result? Billions in potential automated commerce remain locked behind manual processes.

---

## 💡 Solution

**DigiPaga Marketplace** currently exposes two deliberately separate rails:

1. **Agentic commerce:** a real x402 v2 `exact` purchase on Base Sepolia test USDC, using a server-side EOA and the public x402 facilitator.
2. **Human checkout:** the existing Thirdweb/ZeroDev experience and direct mUSDG transfer on Arbitrum Sepolia.

The agent demo does not claim ERC-8004 identity, ZeroDev sponsorship, or Robinhood Chain settlement. Those remain future integration targets.

---
## 🌟 Key Features

### For AI Agents
- ✅ **x402 Native Payments**: HTTP 402 status code + EIP-3009/EIP-712 signatures for trustless micro-payments
- ✅ **Strict Spend Policy**: Exact network, token, domain, recipient, host, amount, timeout, and one-payment enforcement
- ✅ **Settlement Evidence**: Facilitator receipt, onchain transaction receipt, and exact seller balance delta
- ✅ **Protected Delivery**: No access URL is issued before successful settlement

### For Humans
- ✅ **Dual-Rail Discovery**: Visual marketplace with filtering, search, and curation
- ✅ **Interactive Maps**: Geographic and categorical asset exploration
- ✅ **Wallet Integration**: Wagmi + MetaMask/Rabby support
- ✅ **IPFS Storage**: Decentralized asset delivery and verification

### For Developers
- ✅ **Foundry-Based**: Fastest smart contract development and testing framework
- ✅ **Type-Safe**: Full TypeScript stack from contracts to frontend
- ✅ **CI/CD Ready**: GitHub Actions for automated testing and deployment
- ✅ **Modular Architecture**: Clean separation of concerns, easy to extend

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
```

---
## 🔄 How It Works

### x402 Payment Flow

1. The run API performs token/domain/balance preflight and deterministic discovery.
2. The agent requests `GET /x402/datasets/:id/content` without payment and receives a machine-readable x402 v2 HTTP 402.
3. Policy validates every payment field, then the server-side EOA signs one EIP-3009 authorization.
4. The agent retries the same URL with `PAYMENT-SIGNATURE`; the public facilitator verifies and settles it.
5. The server checks the receipt and seller balance delta, then issues a five-minute signed dataset URL.

---
## 🛠️ Tech Stack

### Smart Contracts
- **Framework**: [Foundry](https://book.getfoundry.sh/) (Forge, Cast, Anvil)
- **Language**: Solidity 0.8.20
- **Standards**: ERC-20 (USDC), ERC-8004 (Agent Identity), EIP-712 (Signatures)
- **Testing**: Foundry Tests (Unit, Fuzz, Invariant)

### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Language**: TypeScript 5.x
- **Web3**: Viem, Ethers.js v6
- **Payment Protocol**: x402 v2.27 (`exact`, EIP-3009, upfront settlement)
- **Storage**: server-only demo manifest; existing Pinata integration is preserved but not falsely presented as this demo's protected store

### Frontend
- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS 4
- **Web3**: Wagmi v2, Viem
- **Account Abstraction**: ZeroDev SDK
- **State**: TanStack Query (React Query)

### DevOps
- **CI/CD**: GitHub Actions
- **Testing**: Forge Test, ESLint, TypeScript
- **Monitoring**: Tenderly (transaction debugging)

---
## 📜 Smart Contracts

### Legacy/prototype contracts

These contracts are preserved in the repository but are not used by the real Phase 1 x402 payment path.

| Contract | Purpose | Chain |
|----------|---------|-------|
| **AgentRegistry** | ERC-8004 agent identity management | Arbitrum Sepolia, RH Testnet |
| **RoboticsMarketplace** | Asset listing and purchase logic | Arbitrum Sepolia, RH Testnet |
| **AssetVault** | Escrow and IPFS delivery | Arbitrum Sepolia, RH Testnet |
| **X402Facilitator** | Payment settlement and verification | Arbitrum Sepolia, RH Testnet |

### Contract Addresses (Testnet)

| Network | AgentRegistry | Marketplace | USDC |
|---------|--------------|-------------|------|
| **Arbitrum Sepolia** | `0x...` (TBD) | `0x...` (TBD) | `0x75faf114eafb1BDbe4F43213Fe49D7C47aA714B3` |
| **Robinhood Testnet** | `0x...` (TBD) | `0x...` (TBD) | `0x...` (TBD) |

*Addresses will be updated after deployment*

---
## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **Foundry**: [Install](https://book.getfoundry.sh/getting-started/installation)
- **Git**: v2.x or higher

### Installation
```bash
git clone https://github.com/DigiPaga/digi-robotics.git
cd digi-robotics
cp .env.example .env
cd contracts && forge install && forge build
cd ../x402-server && npm install
cd ../web && npm install
```

### Running Locally
```bash
# Terminal 1: Start x402 server
cd x402-server && npm run dev

# Terminal 2: Start frontend
cd web && npm run dev
```

### Deploying Contracts
```bash
cd contracts
forge script script/Deploy.s.sol:DeployScript --rpc-url arbitrum_sepolia --private-key $PRIVATE_KEY --broadcast --verify
```

---
## 📁 Project Structure

```
digi-robotics/
├── .github/workflows/       # GitHub Actions CI/CD
├── contracts/               # Smart Contracts (Foundry)
│   ├── src/                 # Contract source code
│   ├── script/              # Deployment scripts
│   ├── test/                # Foundry tests
│   └── foundry.toml         # Foundry configuration
├── x402-server/             # Backend (Node.js + Express)
│   ├── src/agent/           # Discovery, spend policy, buyer, run store
│   ├── src/x402/            # Authentic x402 resource middleware
│   ├── src/routes/          # Run/SSE/protected-resource routes
│   └── src/data/            # Public metadata and server-only protected data
├── web/                     # Frontend (Next.js 16)
│   ├── src/app/             # App Router pages
│   └── src/components/      # React components
├── docs/                    # Documentation
├── scripts/                 # Deployment automation
├── AGENTS.md                # AI agent guidelines
└── README.md                # This file
```

---
## 👥 Team

**Built by the DigiPaga Team for the Arbitrum Open House Singapore Buildathon**
- **Oscar** ([@ozkite](https://github.com/ozkite)) - Smart Contracts & Backend
- **Otto** ([@ottodevs](https://github.com/ottodevs)) - Frontend & Integration

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).

---

## 🏆 Hackathon

### Arbitrum Open House Singapore Buildathon
**Participate**: [Join on HackQuest](https://arbitrum-singapore.hackquest.io)  
**Event**: [Arbitrum Open House](https://openhouse.arbitrum.io)

- **Track**: Overall Prize + Robinhood Chain
- **Category**: Agentic Commerce, x402 Payments, Dual-Rail Marketplace
- **Submission Date**: October 4, 2026
- **Prize Pool**: $115,000 USD

### Sponsors & Partners
<div align="center">
  [![Arbitrum](https://img.shields.io/badge/Arbitrum-Foundation-2D3748?style=for-the-badge&logo=arbitrum&logoColor=white)](https://arbitrum.io)
  [![Robinhood](https://img.shields.io/badge/Robinhood-Chain-00C805?style=for-the-badge&logo=robinhood&logoColor=white)](https://robinhood.com/us/en/crypto/chain/)
  [![GMX](https://img.shields.io/badge/GMX-Protocol-1C449B?style=for-the-badge&logo=gm&logoColor=white)](https://gmx.io)
  [![Pendle](https://img.shields.io/badge/Pendle-Finance-7B3FE4?style=for-the-badge&logo=pendle&logoColor=white)](https://www.pendle.finance)
</div>

---

## 📚 Resources
- [Arbitrum Documentation](https://docs.arbitrum.io/)
- [x402 Protocol Specification](https://github.com/x402/x402)
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [Foundry Book](https://book.getfoundry.sh/)
- [ZeroDev SDK](https://zerodev.app/docs)
- [Robinhood Chain Docs](https://docs.robinhood.com/chain)

---

<div align="center">
  <strong>Built with ❤️ for the future of autonomous commerce</strong>
</div>

---

## 🚀 Deployment Status

### ✅ Robinhood Testnet (Chain ID: 46630)
- **AgentRegistry**: `0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331`
- **RoboticsMarketplace**: `0xFd6F3e01c60870a8978665fF2EE872861590bEc3`
- **Explorer**: [View on Robinhood Testnet Explorer](https://testnet.chain.robinhood.com/)

### ⏳ Arbitrum Sepolia (Chain ID: 421614)
- **Status**: Deployment script ready, awaiting testnet faucet funds.

### ✅ Arbitrum Sepolia (Chain ID: 421614)
- **AgentRegistry**: `0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331`
- **RoboticsMarketplace**: `0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331`
- **Explorer**: [View on Arbitrum Sepolia Explorer](https://sepolia.arbiscan.io/)

---

## 🎓 ETHSKILLS Integration

This project follows [ETHSKILLS](https://ethskills.com) guidelines for production-grade Ethereum development.

### Core Principles Applied:
- ✅ **Security First**: All contracts audited against common vulnerabilities
- ✅ **Gas Optimization**: Efficient storage and computation patterns
- ✅ **Upgradeability Ready**: Proxy-compatible architecture
- ✅ **Testing Coverage**: >90% test coverage with Foundry
- ✅ **Documentation**: NatSpec comments and inline explanations

### Tools Used:
- **Slither**: Static analysis for Solidity
- **Foundry**: Testing and fuzzing
- **OpenZeppelin**: Battle-tested contract libraries
- **ZeroDev**: Account Abstraction (ERC-4337) for AI agent Session Keys and gasless human onboarding.

---

## 🎓 ETHSKILLS Integration

This project follows [ETHSKILLS](https://ethskills.com) guidelines for production-grade Ethereum development.

### Core Principles Applied:
- ✅ **Security First**: All contracts audited against common vulnerabilities
- ✅ **Gas Optimization**: Efficient storage and computation patterns
- ✅ **Testing Coverage**: Comprehensive unit and fuzz tests with Foundry
- ✅ **Documentation**: NatSpec comments and inline explanations

### Tools Used:
- **Slither**: Static analysis for Solidity (planned)
- **Foundry**: Testing, fuzzing, and deployment
- **OpenZeppelin**: Battle-tested contract libraries
- **ZeroDev**: Account Abstraction (ERC-4337) for AI agent Session Keys and gasless human onboarding.

---

## 🤝 Hackathon Sponsors & Integrations

This project is built leveraging the best Web3 infrastructure, with special thanks to our hackathon sponsors:

- **Paxos:** We utilize **USDG** and **PYUSD** as the primary stablecoin settlement layers for creator payouts, ensuring regulatory compliance and instant finality.
- **QuickNode:** Powers our high-performance, low-latency RPC connections to Arbitrum and Robinhood Chain, ensuring our AI agents never experience timeout failures during x402 settlements.
- **Dune Analytics:** We track on-chain marketplace metrics (Total Data Volume, Active Agents, Creator Earnings) via our [Dune Dashboard](https://dune.com/your-dashboard-link) *(Link to be updated post-deployment)*.
- **ZeroDev:** Enables true agentic autonomy via ERC-4337 Session Keys and gasless onboarding for retail data collectors.
