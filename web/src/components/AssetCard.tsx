'use client';

import { useState } from 'react';
import { PaymentModal } from './PaymentModal';

interface AssetCardProps {
  asset: {
    id: string;
    name: string;
    price: string;
    type: string;
    ipfsHash?: string;
  };
}

export const AssetCard = ({ asset }: AssetCardProps) => {
  const [showPayment, setShowPayment] = useState(false);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      pdf: '📄',
      cad: '',
      json: '',
      csv: '📈',
    };
    return icons[type] || '';
  };

  return (
    <>
      <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
        <div className="flex items-start justify-between mb-4">
          <span className="text-4xl">{getTypeIcon(asset.type)}</span>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded uppercase">{asset.type}</span>
        </div>

        <h3 className="text-xl font-semibold mb-2">{asset.name}</h3>
        
        <div className="flex items-center justify-between mt-4">
          <p className="text-2xl font-bold text-blue-600">{asset.price}</p>
          <button
            onClick={() => setShowPayment(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Purchase
          </button>
        </div>

        {asset.ipfsHash && (
          <p className="text-xs text-gray-500 mt-2 truncate">
            IPFS: {asset.ipfsHash}
          </p>
        )}
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        assetId={asset.id}
        assetName={asset.name}
        price={asset.price}
      />
    </>
  );
};
