'use client';

import { AgentCatalog } from '@/components/AgentCatalog';
import { WalletConnect } from '@/components/WalletConnect';

export default function AgenticMarketplace() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">🤖 Agentic Commerce</h1>
          <WalletConnect />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">AI Agent Asset Marketplace</h2>
          <p className="text-gray-600">
            Purchase digital assets autonomously using x402 protocol. No human intervention required.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>Your AI agent browses the catalog</li>
            <li>Agent requests an asset (HTTP GET)</li>
            <li>Server returns 402 Payment Required</li>
            <li>Agent signs EIP-712 payment authorization</li>
            <li>Payment settles on Arbitrum/Robinhood Chain</li>
            <li>Asset is delivered via IPFS</li>
          </ol>
        </div>

        <AgentCatalog />
      </main>
    </div>
  );
}
