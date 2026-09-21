'use client';

import { HumanMap } from '@/components/HumanMap';
import { WalletConnect } from '@/components/WalletConnect';

export default function HumanDiscovery() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">🗺️ Human Discovery Map</h1>
          <WalletConnect />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Explore Robotics Resources</h2>
          <p className="text-gray-600">
            Find workshops, tools, and communities to start your robotics journey.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold mb-2">For Humans:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Interactive map of robotics resources</li>
            <li>Curated asset collections</li>
            <li>Community workshops and events</li>
            <li>Step-by-step guides to get started</li>
          </ul>
        </div>

        <HumanMap />
      </main>
    </div>
  );
}
