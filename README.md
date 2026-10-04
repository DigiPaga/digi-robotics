# DigiRobotics: Agentic Commerce for Physical AI

![DigiRobotics Autonomous Commerce](https://raw.githubusercontent.com/DigiPaga/digi-robotics/refs/heads/main/web/public/pitch-deck/slide-01-autonomous-commerce.jpg)

> **An AI-native egocentric capture marketplace powered by stablecoins and the x402 protocol.**  
> Built for the **Arbitrum Open House Singapore Buildathon**.

[![Arbitrum](https://img.shields.io/badge/Arbitrum-Foundation-2D3748?style=for-the-badge&logo=arbitrum&logoColor=white)](https://arbitrum.io)
[![Robinhood](https://img.shields.io/badge/Robinhood-Chain-00C805?style=for-the-badge&logo=robinhood&logoColor=white)](https://robinhood.com/us/en/crypto/chain/)
[![USDG](https://img.shields.io/badge/Stablecoin-USDG%20(mUSDG%20on%20testnet)-00522C?style=for-the-badge&logoColor=white)](https://paxos.com)
[![ZeroDev](https://img.shields.io/badge/ZeroDev-ERC--4337-6366F1?style=for-the-badge&logoColor=white)](https://zerodev.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

<a id="real-x402-agent-demo"></a>

## 🚀 Real x402 Agent Demo

The `/agent-demo` route demonstrates a complete **x402 v2 payment cycle** across Robinhood Chain Testnet and Arbitrum Sepolia:

1. An unpaid resource request receives a machine-readable **HTTP 402 Payment Required** response.
2. A deterministic server-side agent validates the payment against strict spending policies.
3. The agent signs an **EIP-3009 `transferWithAuthorization`** authorization using **EIP-712** typed data for MockUSDG (`mUSDG`), the project's test stablecoin.
4. The agent retries the protected resource with the x402 payment signature.
5. The x402 facilitator verifies the payment and settles it on-chain through the `X402Facilitator` contract.
6. Only after confirmed settlement does the server issue a short-lived signed URL for the protected robotics dataset.

> **Dual-rail architecture:** The autonomous-agent demo uses x402 with MockUSDG (`mUSDG`, EIP-3009) on Robinhood Chain Testnet (`46630`) and Arbitrum Sepolia (`421614`). The human checkout flow uses direct mUSDG transfers through ZeroDev embedded wallets on Arbitrum Sepolia.

> **Live deployment:** The web app runs at [digirobotics.xyz](https://digirobotics.xyz) and the x402 server at [x402.digirobotics.xyz](https://x402.digirobotics.xyz), both on Cloudflare Workers. An x402 server instance settles on one network, so there are two: [x402.digirobotics.xyz](https://x402.digirobotics.xyz) for Arbitrum Sepolia and [x402-rh.digirobotics.xyz](https://x402-rh.digirobotics.xyz) for Robinhood Chain Testnet (see [`x402-server/wrangler.jsonc`](x402-server/wrangler.jsonc)). The chain switch on `/agent-demo` picks between them.

📖 **Full runbook:** [`x402-server/docs/AGENT_DEMO_RUNBOOK.md`](x402-server/docs/AGENT_DEMO_RUNBOOK.md)

---

## 📋 Table of Contents

- [Real x402 Agent Demo](#real-x402-agent-demo)
- [Problem](#problem)
- [Solution](#solution)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [How It Works: The x402 Flow](#x402-flow)
- [Tech Stack](#tech-stack)
- [Smart Contracts](#smart-contracts)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Sponsors and Integrations](#sponsors)
- [Team](#team)
- [ETHSKILLS Integration](#ethskills)
- [Security Notes](#security)
- [Current Demo Status](#demo-status)
- [License](#license)

---

<a id="problem"></a>

## 🔥 Problem

Traditional data marketplaces require human intervention for discovery, purchasing, verification, and delivery. This creates friction and prevents autonomous systems from operating at machine speed.

AI agents, robotics teams, and decentralized applications lack a unified mechanism to:

- **Discover robotics training data** programmatically.
- **Purchase digital resources** without manual approval workflows.
- **Execute micropayments** using machine-readable payment requirements.
- **Verify settlement** before accessing protected content.
- **Reward human contributors** for capturing valuable real-world actions.

As a result, valuable human dexterity data remains difficult to source while billions of smartphones remain underutilized as capture devices.

---

<a id="solution"></a>

## 💡 Solution

**DigiRobotics** connects human contributors, robotics teams, datasets, and autonomous agents through two purpose-built payment rails:

1. **Agentic Commerce**  
   A real x402 v2 `exact` payment flow using MockUSDG (`mUSDG`) on Robinhood Chain Testnet and Arbitrum Sepolia. A server-side agent discovers a dataset, validates its payment requirements, signs an EIP-3009 authorization, and unlocks the resource after confirmed settlement.

2. **Human Checkout**  
   A Thirdweb and ZeroDev embedded-wallet experience using direct mUSDG transfers on Arbitrum Sepolia, with no seed phrases required.

Together, these rails create a marketplace where humans can capture and monetize robotics training data while autonomous agents discover, verify, purchase, and consume it.

---

<a id="key-features"></a>

## 🌟 Key Features

### For AI Agents

- ✅ **Native x402 payments:** HTTP 402 responses with EIP-3009 and EIP-712 payment authorizations.
- ✅ **Deterministic discovery:** Programmatic dataset discovery and selection without requiring an LLM.
- ✅ **Strict spending policy:** Validation of network, token, host, recipient, amount, timeout, and one-payment-per-run limits.
- ✅ **Settlement evidence:** Facilitator response, on-chain transaction receipt, and seller balance-delta verification.
- ✅ **Protected delivery:** Dataset access is never issued before successful settlement.
- ✅ **Idempotent execution:** Reconnecting or refreshing cannot trigger duplicate payments.

### For Human Contributors

- ✅ **Zero-friction onboarding:** Embedded wallets without seed phrases.
- 🧪 **Egocentric capture:** Contributors can upload first-person robotics training videos (prototype, through the Telegram bot).
- 🚧 **Stablecoin rewards:** Contributors can receive USDG or PYUSD after validation (planned; this repository has no payout flow yet).
- 🧪 **Telegram ingestion:** Videos can be submitted through the DigiRobotics Telegram bot (prototype; it starts only with the Node server when `TELEGRAM_BOT_TOKEN` is set).
- 🚧 **Campaign discovery:** Contributors can find capture tasks requested by robotics teams (planned).

### For Robotics Teams

- ✅ **Curated training data:** Discover video datasets organized by task, environment, and quality.
- ✅ **Custom data requests:** Request audiovisual, software, hardware, or specialized capture campaigns.
- ✅ **Agent-ready resources:** Allow autonomous buyers to discover and purchase protected datasets.
- ✅ **Programmatic delivery:** Retrieve purchased resources through protected API endpoints.

### For Developers

- ✅ **Full TypeScript stack:** Shared types across the frontend and backend.
- ✅ **Foundry-based contracts:** Solidity testing, deployment, and fuzzing.
- ✅ **Modular architecture:** Clear separation between the frontend, agent runtime, payment policy, protected resources, contracts, and storage.
- ✅ **Fail-closed configuration:** Missing payment or wallet configuration does not expose protected content.

---

<a id="architecture"></a>

## 🏗️ Architecture

### Autonomous x402 Agent Rail

```mermaid
flowchart LR
    A["Next.js<br/>/agent-demo"]
    B["Express Run API<br/>and SSE"]
    C["Discovery and<br/>Policy Engine"]
    D["Server-Side<br/>x402 Buyer"]
    E{"Protected Dataset<br/>Resource"}
    F["x402<br/>Facilitator"]
    G[("Robinhood Chain Testnet<br/>and Arbitrum Sepolia<br/>MockUSDG (mUSDG)")]
    H[("Protected Dataset<br/>Storage")]

    A -->|"Create run"| B
    B -->|"Search and evaluate"| C
    C -->|"Approved candidate"| D

    D -->|"1. Unpaid GET"| E
    E -->|"2. HTTP 402 requirements"| D
    D -->|"3. PAYMENT-SIGNATURE"| E

    E -->|"4. Verify and settle"| F
    F -->|"5. Settle on-chain"| G
    G -->|"6. Settlement receipt"| E

    H -->|"Protected resource"| E
    E -->|"7. Five-minute signed URL"| D
    D -->|"8. Run result"| B
    B -->|"9. Live SSE events"| A

    classDef frontend fill:#161c29,stroke:#84cc16,stroke-width:2px,color:#ffffff
    classDef backend fill:#1a1f2e,stroke:#a0a0a0,stroke-width:1px,color:#ffffff
    classDef agent fill:#1a1f2e,stroke:#84cc16,stroke-width:2px,color:#ffffff
    classDef facilitator fill:#16372a,stroke:#84cc16,stroke-width:2px,color:#ffffff
    classDef chain fill:#2d3748,stroke:#ffffff,stroke-width:2px,color:#ffffff
    classDef storage fill:#161c29,stroke:#a0a0a0,stroke-width:1px,color:#ffffff

    class A frontend
    class B,C backend
    class D agent
    class E,F facilitator
    class G chain
    class H storage
```

### Human Checkout Rail

```mermaid
flowchart LR
    A["Next.js Marketplace"]
    B["Thirdweb Authentication"]
    C["ZeroDev Embedded Wallet"]
    D["Direct mUSDG Transfer"]
    E[("Arbitrum Sepolia")]
    F["Human Checkout Confirmation"]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F

    classDef frontend fill:#161c29,stroke:#84cc16,stroke-width:2px,color:#ffffff
    classDef wallet fill:#1a1f2e,stroke:#84cc16,stroke-width:2px,color:#ffffff
    classDef chain fill:#2d3748,stroke:#ffffff,stroke-width:2px,color:#ffffff

    class A frontend
    class B,C,D wallet
    class E,F chain
```

---

<a id="x402-flow"></a>

## 🔄 How It Works: The x402 Flow

### 1. Preflight

The run API validates:

- Agent wallet balance.
- Supported network and token.
- Allowed resource host.
- Allowed payment recipient.
- Maximum payment amount.
- Facilitator availability.
- Dataset configuration.

### 2. Discovery

The agent searches the configured dataset registry and evaluates compatible resources using deterministic selection logic.

### 3. Challenge

The agent requests the protected resource without a payment signature:

```http
GET /x402/datasets/:id/content
```

The resource server responds with:

```http
HTTP/1.1 402 Payment Required
```

The response contains machine-readable x402 payment requirements.

### 4. Policy Validation

Before signing, the agent validates:

- Network.
- Asset address.
- Payment scheme.
- Atomic amount.
- Payment recipient.
- Resource URL.
- Host allowlist.
- Spending limit.
- Request timeout.
- Run idempotency.

### 5. Authorization

The server-side agent wallet signs an EIP-3009 authorization using EIP-712 typed data.

No agent private key is exposed to the browser.

### 6. Settlement

The agent retries the protected resource with the x402 payment signature.

The facilitator verifies the authorization and settles the payment through the `X402Facilitator` contract on Robinhood Chain Testnet or Arbitrum Sepolia, depending on the network the server is configured for (`X402_NETWORK`).

### 7. Fulfillment

After settlement, the backend verifies:

- Facilitator success response.
- On-chain transaction receipt.
- Successful receipt status.
- Expected seller balance delta.
- Correct asset.
- Correct amount.
- Correct payment recipient.

The backend then issues a short-lived signed dataset URL.

### 8. Delivery

The frontend receives genuine backend events through Server-Sent Events and displays:

- Selected dataset.
- Network and asset.
- Payment amount.
- Transaction hash.
- Explorer link.
- Settlement result.
- Dataset unlock status.

---

<a id="tech-stack"></a>

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Smart contracts | Foundry, Solidity 0.8.24, EIP-712, EIP-3009, ERC-8004 |
| Backend | Node.js, Express.js, TypeScript, x402 v2 |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Web3 | Viem |
| Account abstraction | ZeroDev SDK, ERC-4337 Kernel accounts (session keys planned) |
| Authentication | Thirdweb |
| Storage | Pinata and IPFS (Telegram capture prototype) |
| RPC infrastructure | Public RPC endpoints (QuickNode planned) |
| Analytics | Dune Analytics (planned) |
| Hosting | Cloudflare Workers |
| CI/CD | GitHub Actions |

---

<a id="smart-contracts"></a>

## 📜 Smart Contracts

### Active Agent Demo and Human Checkout Infrastructure

| Network | Component | Purpose |
|---|---|---|
| Arbitrum Sepolia | MockUSDG (`mUSDG`) | Human marketplace checkout asset |
| Arbitrum Sepolia | ZeroDev smart account | Embedded account experience (session keys planned) |
| Arbitrum Sepolia | Thirdweb authentication | User authentication and onboarding |
| Arbitrum Sepolia | MockUSDG (`mUSDG`, EIP-3009) | Agentic x402 payment asset |
| Robinhood Chain Testnet | MockUSDG (`mUSDG`, EIP-3009) | Agentic x402 payment asset |
| Robinhood Chain Testnet | Server-side agent wallet | Signs bounded EIP-3009 payment authorizations |
| Robinhood Chain Testnet and Arbitrum Sepolia | `X402Facilitator` contract | Payment verification and settlement |
| Mainnet — planned | Production USDG and PYUSD | Production settlement for robotics data purchases |

The x402 contracts are deployed at the same addresses on Arbitrum Sepolia (`421614`) and Robinhood Chain Testnet (`46630`), as recorded in [`contracts/deployments`](contracts/deployments):

| Contract | Address |
|---|---|
| MockUSDG (`mUSDG`, EIP-3009) | `0xBbB4155d20D739faABC3af41A3344FAEfD76dDD4` |
| `X402Facilitator` | `0xB7D6F2aC244C8562CEd113AAf1a1A41C253FE816` |

The human checkout still uses the first MockUSDG on Arbitrum Sepolia (`0x39271d08C111912B1F32465745f3123a878C83Bb`, a plain ERC-20 without EIP-3009) unless `NEXT_PUBLIC_MOCK_USDG_ADDRESS_ARBITRUM_SEPOLIA` or `NEXT_PUBLIC_MOCK_USDG_ADDRESS` is set at build time. See [`web/src/lib/stablecoinConfig.ts`](web/src/lib/stablecoinConfig.ts).

### Legacy and Prototype Contracts

| Contract | Purpose | Networks |
|---|---|---|
| `AgentRegistry` | ERC-8004 agent identity management | Arbitrum Sepolia, Robinhood Chain Testnet |
| `RoboticsMarketplace` | Dataset listing and purchase logic | Arbitrum Sepolia, Robinhood Chain Testnet |
| `AssetVault` | Asset URI storage | No deployment recorded in this repository |

---

<a id="getting-started"></a>

## 🚀 Getting Started

### Prerequisites

- **Node.js:** 20.9 or later
- **npm:** Compatible with the installed Node.js version
- **Foundry:** [Installation guide](https://book.getfoundry.sh/getting-started/installation)
- **Git:** 2.x or later

### 1. Clone the Repository

```bash
git clone https://github.com/DigiPaga/digi-robotics.git
cd digi-robotics
```

### 2. Install Backend Dependencies

```bash
cd x402-server
npm install
cp .env.example .env
```

Configure the required backend environment variables in:

```text
x402-server/.env
```

Do not commit real wallet keys, bot tokens, or API credentials.

`.env.example` ships with the `REAL_X402_TEST_ASSET` mode enabled, which pays in Base Sepolia test USDC through the public x402.org facilitator. To run the same rail as the live deployment, switch to the commented `REAL_MUSDG_X402` block in that file.

### 3. Install Frontend Dependencies

```bash
cd ../web
npm install
cp .env.example .env.local
```

Configure the frontend API URL and other public environment variables in:

```text
web/.env.local
```

Never expose agent private keys through `NEXT_PUBLIC_*` variables.

### 4. Install and Build the Contracts

```bash
cd ../contracts
forge install
forge build
forge test
```

### 5. Run the Backend

Open a terminal:

```bash
cd x402-server
npm run dev
```

The backend runs at:

```text
http://localhost:3001
```

### 6. Run the Frontend

Open a second terminal:

```bash
cd web
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

### 7. Open the Agent Demo

```text
http://localhost:3000/agent-demo
```

### Verify the Protected Resource

An unpaid request should return HTTP 402:

```bash
curl -i http://localhost:3001/x402/datasets/engine-assembly-pov/content
```

Expected response status:

```http
HTTP/1.1 402 Payment Required
```

For the complete funding, configuration, and verification procedure, see:

[`x402-server/docs/AGENT_DEMO_RUNBOOK.md`](x402-server/docs/AGENT_DEMO_RUNBOOK.md)

### Operator Console

A private operator console is served at `/ops`. It requires Google sign-in and an email allowlist; the variables are documented in [`web/.env.example`](web/.env.example).

---

<a id="testing"></a>

## 🧪 Testing

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs four jobs on every push and pull request to `main`: `web`, `contracts`, `x402-server`, and `x402-e2e`, an end-to-end mUSDG x402 flow on a local Anvil chain. The same checks run locally:

```bash
# web: lint, unit tests, production build
cd web
npm ci
npm run lint
npm test
npm run build
```

```bash
# contracts: needs Foundry and the git submodules
git submodule update --init --recursive
cd contracts
forge build
forge test -vvv
```

```bash
# x402-server: unit and integration tests
cd x402-server
npm ci
npm test

# x402-server: end-to-end on Anvil, needs Foundry on PATH
npm run test:e2e
```

`x402-server` also provides `npm run typecheck` and `npm run lint`, which CI does not run.

---

<a id="project-structure"></a>

## 📁 Project Structure

```text
digi-robotics/
├── contracts/                       # Solidity contracts and Foundry tests
│   ├── src/
│   ├── script/
│   └── test/
├── docs/                            # Project documentation
├── web/                             # Next.js frontend
│   ├── public/
│   │   └── pitch-deck/
│   └── src/
│       ├── app/
│       │   └── agent-demo/
│       ├── components/
│       └── lib/
├── x402-server/                     # Express backend and agent runtime
│   ├── docs/
│   │   └── AGENT_DEMO_RUNBOOK.md
│   ├── src/
│   │   ├── agent/
│   │   ├── config/
│   │   ├── data/
│   │   ├── routes/
│   │   ├── telegramBot.ts
│   │   └── server.ts
│   └── uploads/
├── LICENSE
└── README.md
```

---

<a id="sponsors"></a>

## 🏆 Sponsors and Integrations

DigiRobotics uses infrastructure and tooling from the following ecosystem partners:

| Sponsor or Integration | Contribution |
|---|---|
| Arbitrum | L2 infrastructure and Buildathon host |
| Robinhood Chain | Testnet infrastructure and payment experimentation |
| Paxos | USDG and PYUSD stablecoin ecosystem |
| ZeroDev | ERC-4337 account abstraction |
| Thirdweb | Authentication and wallet onboarding |
| QuickNode | High-performance RPC infrastructure (planned; the code uses public RPC endpoints) |
| Pinata | IPFS storage for the Telegram capture prototype |
| Dune Analytics | On-chain marketplace analytics (planned) |

---

<a id="team"></a>

## 👥 Team

Built by the DigiPaga team for the Arbitrum Open House Singapore Buildathon.

- **Oscar ([@ozkite](https://github.com/ozkite))** _ Product Design & Development
- **Otto ([@ottodevs](https://github.com/ottodevs))** _ Product Deployments & Integrations
- **DigiAgent ([@digiagent](https://github.com/digiagent))** _ Research & Technical Assistance 

---

<a id="ethskills"></a>

## 🎓 ETHSKILLS Integration

This project follows ETHSKILLS guidance for production-oriented Ethereum development, with additional consideration for L2 execution and sequencer behavior.

### Principles Applied

- ✅ **Security-first development:** Contracts and backend flows are reviewed and tested against common vulnerabilities, including reentrancy and access-control failures.
- ✅ **Spending constraints:** Autonomous payments are restricted by explicit asset, network, recipient, host, amount, and timeout policies.
- ✅ **Gas awareness:** Storage and computation patterns are designed with L2 execution in mind.
- ✅ **Testing:** Foundry unit and fuzz tests are used where applicable.
- ✅ **Typed transactions:** EIP-712 typed data is used for payment authorization.
- ✅ **Secret isolation:** Agent signing credentials remain on the backend.
- ✅ **Documentation:** Contracts and critical flows include NatSpec and implementation documentation.

### Tools Used

- **Foundry:** Contract compilation, testing, fuzzing, and deployment.
- **OpenZeppelin:** Standard contract implementations and security primitives.
- **ZeroDev:** ERC-4337 smart accounts and sponsored transactions (session keys planned).
- **Viem:** Typed EVM reads, writes, and receipt verification.
- **x402:** Machine-readable HTTP payment requirements and settlement.
- **Pinata:** IPFS storage for the Telegram capture prototype.

---

<a id="security"></a>

## 🔐 Security Notes

- Never commit `.env` or `.env.local` files.
- Never expose agent wallet keys to the frontend.
- Never unlock protected content after transaction submission alone.
- Always verify settlement and receipt status before fulfillment.
- Restrict autonomous spending through explicit allowlists and maximum amounts.
- Rotate credentials that have been exposed during development.
- Use testnet assets only for the public demonstration.

---

<a id="demo-status"></a>

## 🗺️ Current Demo Status

| Capability | Status |
|---|---|
| Marketplace interface | ✅ Available |
| Human mUSDG checkout | ✅ Testnet demo — Arbitrum Sepolia |
| x402 protected resource | ✅ Available |
| Deterministic agent buyer | ✅ Available |
| HTTP 402 challenge | ✅ Available |
| EIP-3009 authorization | ✅ Available |
| Facilitator settlement | ✅ Robinhood Chain Testnet and Arbitrum Sepolia |
| Signed dataset delivery | ✅ Available |
| Telegram capture ingestion | 🧪 Prototype |
| Production stablecoin settlement | 🚧 Planned |
| Mainnet deployment | 🚧 Planned |

---

<a id="license"></a>

## 📄 License

This project is released under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ for the future of autonomous commerce.**

*Arbitrum Open House Singapore Buildathon*  
*Submission date: October 4, 2026 · Prize pool: $115,000 USD*

</div>
