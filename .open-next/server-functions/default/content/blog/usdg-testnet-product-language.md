---
slug: "usdg-testnet-product-language"
title: "How to talk about stablecoins in a testnet product"
excerpt: "A content checklist for keeping USDG ecosystem language accurate across prototypes, demos, and production-facing interfaces."
category: "Stablecoins"
publishedAt: "2026-09-10"
author: "DigiRobotics Protocol Lab"
readingTime: "4 min read"
---

Stablecoin language carries technical and financial meaning. In a testnet product, a short label can accidentally imply that a mock asset is redeemable, production-issued, or equivalent to the real-world token it represents.

DigiRobotics is built for the USDG and Paxos ecosystem. Its current supported networks are Arbitrum Sepolia and Robinhood Chain Testnet. The interface must still describe each configured test asset exactly as it exists.

## Configuration comes before copy

Product copy should derive network names, token symbols, and decimal handling from typed configuration. Content should never invent a contract address or silently substitute a familiar stablecoin.

For a test deployment, preserve qualifiers such as `mock` or `test` wherever users could otherwise mistake the asset for production Paxos USDG.

## Make the environment visible

A good transaction summary answers four questions before a user approves an action:

- Which network is active?
- Which configured asset is being used?
- Is the asset a test asset?
- What amount will be authorized?

The same information should remain available in receipts and support logs, excluding secrets and reusable signatures.

## Avoid promises the software cannot support

Words such as *dollar*, *redeemable*, or *yield* should be used only when the implemented product and issuer terms support them. A test token can simulate denomination and transfer behavior without carrying production redemption rights.

Precision is not merely a compliance exercise. It is interface safety: users and agents make better decisions when the environment, asset, and limitations are unambiguous.
