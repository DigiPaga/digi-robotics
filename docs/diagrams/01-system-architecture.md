# System Architecture Overview

```mermaid
# System Architecture Overview

```mermaid
graph TD
    subgraph Client Layer
        A[Retail User / Data Collector]
        B[AI Agent / Robot Builder]
        C[Next.js Frontend App]
    end

    subgraph Account Abstraction
        ZD[ZeroDev SDK]
        ZD -->|ERC-4337 Smart Account| C
        ZD -->|Session Keys & Gasless| B
    end

    subgraph Backend Services
        D[x402 Express Server]
        E[Dynamic Pricing Engine]
        F[Reputation Service]
        G[Agent Orchestrator]
    end

    subgraph Blockchain Layer
        H[Arbitrum Sepolia]
        I[Robinhood Testnet]
        J[AgentRegistry ERC-8004]
        K[RoboticsMarketplace]
    end

    subgraph Storage & Infra
        L[IPFS / Pinata]
        M[Encrypted Dataset Vault]
    end

    A -->|1. Record & Upload| C
    B -->|2. Query & Purchase| C
    C -->|3. API Requests| D
    D -->|4. Validate EIP-712 / EIP-1271| D
    D -->|5. Check Nonce & Reputation| F
    D -->|6. Calculate Dynamic Price| E
    D -->|7. Settle Payment| J
    D -->|7. Settle Payment| K
    D -->|8. Release Decryption Key| B
    J -.->|On-chain Events| H
    K -.->|On-chain Events| I
    A -->|9. Encrypted Upload| L
    L --> M
```
