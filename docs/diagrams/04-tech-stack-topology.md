# Technology Stack & Chain Topology

```mermaid



graph LR
    subgraph L1 ["Layer 1: Base Settlement"]
        ETH((Ethereum Mainnet))
    end

    subgraph L2 ["Layer 2: Execution & Scaling"]
        ARB((Arbitrum Sepolia))
        RH((Robinhood Testnet))
        ETH -.->|Bridging / Finality| ARB
    end

    subgraph AA ["Account Abstraction (ERC-4337)"]
        ZB["ZeroDev Bundler"]
        ZP["ZeroDev Paymaster"]
        ZS["Session Key Validator"]
        ARB <-->|User Operations| ZB
        ZB <--> ZP
        ZB <--> ZS
    end

    subgraph SC ["Smart Contracts"]
        REG["AgentRegistry (ERC-8004)"]
        MKT["RoboticsMarketplace"]
        ARB -.-> REG
        ARB -.-> MKT
        RH -.-> REG
        RH -.-> MKT
    end

    subgraph INFRA ["Off-Chain Infrastructure"]
        NEXT["Next.js 14 Frontend"]
        EXP["Express x402 Server"]
        IPFS["IPFS / Pinata"]
        DB[("PostgreSQL / Mock DB")]
        
        NEXT -->|Viem / Wagmi| ZB
        NEXT -->|API Calls| EXP
        EXP -->|Read/Write| REG
        EXP -->|Read/Write| MKT
        EXP -->|Store/Retrieve| IPFS
        EXP -->|State| DB
    end
