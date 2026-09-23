# AI Agent Purchase Journey: Autonomous x402 Commerce

```mermaid
sequenceDiagram
    participant AI as AI Agent (with Session Key)
    participant FE as Frontend / Agent Script
    participant BE as x402 Backend
    participant Rep as Reputation Service
    participant Price as Dynamic Pricing
    participant SC as Smart Contract (Arbitrum/Robinhood)
    participant IPFS as IPFS Gateway

    AI->>FE: 1. "Find high-quality soldering datasets"
    FE->>BE: 2. GET /api/submissions?tag=soldering&minScore=90
    BE-->>FE: 3. Returns dataset metadata (ID: ds-001, Base Price: 0.50 USDC)
    AI->>FE: 4. Evaluates value, decides to purchase
    FE->>BE: 5. GET /api/purchase/ds-001
    BE-->>FE: 6. HTTP 402 Payment Required (includes nonce, deadline, amount)
    AI->>AI: 7. Signs EIP-712 Payment message using ZeroDev Session Key
    FE->>BE: 8. POST /api/purchase/ds-001
    Note over FE,BE: Headers: X-Agent-Address, X-Signature, X-Payment-Proof
    BE->>Rep: 9. Verify agent trust score > 70
    BE->>Price: 10. Calculate dynamic price (e.g., +20% due to high demand)
    BE->>BE: 11. Validate EIP-1271 Signature & Nonce (Anti-Replay)
    BE->>SC: 12. Execute settlePayment(assetId, agent, amount)
    SC-->>BE: 13. Transaction Confirmed (USDC transferred)
    BE->>IPFS: 14. Fetch decryption key for CID
    BE-->>FE: 15. HTTP 200 OK { ipfsGatewayUrl, decryptionKey }
    FE->>AI: 16. Dataset decrypted and fed to robotics training pipeline
