'use client';

import { useEffect, useState } from 'react';

interface MapAsset {
  id: string;
  name: string;
  price: string;
  lat: number;
  lng: number;
  category: string;
}

export const HumanMap = () => {
  const [assets, setAssets] = useState<MapAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MapAsset | null>(null);

  useEffect(() => {
    // Mock data for demo
    setAssets([
      { id: '1', name: 'Robot Workshop SF', price: '00', lat: 37.7749, lng: -122.4194, category: 'workshop' },
      { id: '2', name: 'AI Lab NYC', price: '000', lat: 40.7128, lng: -74.0060, category: 'lab' },
      { id: '3', name: 'Hardware Store LA', price: '00', lat: 34.0522, lng: -118.2437, category: 'store' },
    ]);
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Human Discovery Map</h2>
      <p className="text-gray-600 mb-6">Explore robotics resources, workshops, and tools near you.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-200 rounded-lg h-96 flex items-center justify-center">
          <p className="text-gray-500">Interactive Map (Leaflet integration pending)</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Nearby Resources</h3>
          {assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className={}
            >
              <h4 className="font-semibold">{asset.name}</h4>
              <p className="text-sm text-gray-600">{asset.category}</p>
              <p className="text-lg font-bold text-green-600">{asset.price}</p>
            </div>
          ))}
        </div>
      </div>

      {selectedAsset && (
        <div className="mt-6 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-2xl font-bold mb-2">{selectedAsset.name}</h3>
          <p className="text-gray-600 mb-4">Category: {selectedAsset.category}</p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            View Details
          </button>
        </div>
      )}
    </div>
  );
};
