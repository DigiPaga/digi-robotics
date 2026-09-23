# Retail User Journey: Data Collection  Monetization

`` mermaid

Retail User Journey: Data Collection & Monetization
sequenceDiagram
    participant U as Retail User (Smartphone)
    participant App as DigiAgent Mobile/Web App
    participant ZD as ZeroDev (Embedded Wallet)
    participant BE as x402 Backend
    participant IPFS as IPFS (Pinata)
    participant SC as Smart Contract (Marketplace)

    U->>App: 1. Opens app & records egocentric video
    App->>App: 2. ScanTech AI evaluates quality (score > 85)
    App->>ZD: 3. Request embedded wallet creation (if new)
    ZD-->>App: 4. Wallet address generated (Gasless via Paymaster)
    App->>IPFS: 5. Encrypt video & upload to IPFS
    IPFS-->>App: 6. Returns IPFS CID & Encryption Key Hash
    App->>BE: 7. POST /api/submissions (metadata + CID)
    BE-->>App: 8. Status: "Pending Verification"
    Note over BE,SC: Time passes... AI Agent or Human buys the data
    SC->>BE: 9. PaymentSettled Event triggered (USDC)
    BE->>ZD: 10. Notify user of successful sale
    ZD->>U: 11. USDC balance updated + Yield starts accruing
```
