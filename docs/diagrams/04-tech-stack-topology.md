Technology Stack & Chain Topology
graph LR
    subgraph Layer 1: Base Settlement
        ETH((Ethereum Mainnet))
    end

    subgraph Layer 2: Execution & Scaling
        ARB((Arbitrum Sepolia))
        RH((Robinhood Testnet))
        ETH -.->|Bridging / Finality| ARB
    end

    subgraph Account Abstraction (ERC-4337)
        ZB[ZeroDev Bundler]
        ZP[ZeroDev Paymaster]
        ZS[Session Key Validator]
        ARB <-->|User Operations| ZB
        ZB <--> ZP
        ZB <--> ZS
    end

    subgraph Smart Contracts
        REG[AgentRegistry <br/> ERC-8004]
        MKT[RoboticsMarketplace]
        ARB -.-> REG
        ARB -.-> MKT
        RH -.-> REG
        RH -.-> MKT
    end

    subgraph Off-Chain Infrastructure
        NEXT[Next.js 14 Frontend]
        EXP[Express x402 Server]
        IPFS[IPFS / Pinata]
        DB[(PostgreSQL / Mock DB)]
        
        NEXT -->|Viem / Wagmi| ZB
        NEXT -->|API Calls| EXP
        EXP -->|Read/Write| REG
        EXP -->|Read/Write| MKT
        EXP -->|Store/Retrieve| IPFS
        EXP -->|State| DB
    end

    classDef chain fill:#171b25,stroke:#a3e635,stroke-width:2px,color:#fff
    classDef infra fill:#161c29,stroke:#64748b,stroke-width:1px,color:#cbd5e1
    class ARB,RH,ETH chain
    class NEXT,EXP,IPFS,DB,ZB,ZP,ZS infra
