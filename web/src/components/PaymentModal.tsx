'use client';

import { useState } from 'react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  assetName: string;
  price: string;
}

export const PaymentModal = ({ isOpen, onClose, assetId, assetName, price }: PaymentModalProps) => {
  const [step, setStep] = useState<'idle' | 'signing' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');


  const handlePayment = async () => {
    try {
      setStep('signing');
      
      // Simulate signature creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStep('processing');
      
      // Simulate payment processing
      const response = await fetch('http://localhost:3001/api/assets/' + assetId, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Address': '0x333',
          'X-Signature': '0xmocksignature',
        },
      });

        throw new Error('Payment failed');
      }

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Purchase Asset</h2>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-2">Asset: {assetName}</p>
          <p className="text-3xl font-bold text-blue-600">{price}</p>
        </div>

        {step === 'idle' && (
          <div className="space-y-4">
            <p className="text-gray-700">
              This purchase will be executed by your AI agent using x402 protocol.
            </p>
            <button
              onClick={handlePayment}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Confirm Purchase
            </button>
          </div>
        )}

        {step === 'signing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Signing transaction...</p>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Processing payment on Arbitrum...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <p className="text-gray-700 mb-4">Payment successful! Asset is being delivered.</p>
            <button
              onClick={onClose}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
            >
              Close
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-4">✗</div>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => setStep('idle')}
              className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
            >
              Try Again
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full text-gray-600 py-2 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
