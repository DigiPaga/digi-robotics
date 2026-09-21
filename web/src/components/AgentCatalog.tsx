'use client';

import { useEffect, useState } from 'react';

interface Asset {
  id: string;
  name: string;
  price: string;
  type: string;
  category: string;
}

export const AgentCatalog = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', category: '', search: '' });

  useEffect(() => {
    fetchCatalog();
  }, [filters]);

  const fetchCatalog = async () => {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch();
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Failed to fetch catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading catalog...</div>;
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">AI Agent Asset Catalog</h2>
      
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search assets..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="px-4 py-2 border rounded"
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="px-4 py-2 border rounded"
        >
          <option value="">All Types</option>
          <option value="pdf">PDF</option>
          <option value="cad">CAD</option>
          <option value="json">JSON</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <div key={asset.id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold mb-2">{asset.name}</h3>
            <p className="text-gray-600 mb-4">Type: {asset.type}</p>
            <p className="text-2xl font-bold text-blue-600 mb-4">{asset.price}</p>
            <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              Purchase with Agent
            </button>
          </div>
        ))}
      </div>

      {assets.length === 0 && (
        <p className="text-center text-gray-500">No assets found.</p>
      )}
    </div>
  );
};
