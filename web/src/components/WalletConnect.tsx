'use client';

import { useState } from 'react';

export const WalletConnect = () => {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      // In production, this would use ZeroDev SDK
      // For demo, we simulate connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAddress('0x1234...5678');
      setConnected(true);
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setAddress('');
  };

  if (connected) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-mono">{address}</span>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
