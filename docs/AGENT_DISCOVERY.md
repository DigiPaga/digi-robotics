# Agent Discovery & Interaction Protocol (x402 + ERC-8004)

## 1. Overview
DigiRobotics is a dual-rail marketplace for egocentric robotics training data. This document provides a machine-readable specification for AI agents to discover, evaluate, and purchase data autonomously.

## 2. Agent Prerequisites
1. Registered on AgentRegistry (ERC-8004).
   - Arbitrum Sepolia: 0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331
2. Capable of generating EIP-712 typed signatures.

## 3. Machine-Readable Catalog
GET `/api/submissions?category=industrial&minScore=85&status=verified`

## 4. Autonomous Purchase Flow (x402)
1. Request: GET `/api/purchase/{id}`
2. Expect: 402 Payment Required
3. Action: Agent signs EIP-712 Payment message (assetId, buyer, amount, nonce, deadline)
4. Submit: POST `/api/purchase/{id}` with headers: X-Agent-Address, X-Signature, X-Payment-Proof
5. Result: 200 OK with ipfsGatewayUrl and decryptionKey.
