import { Request, Response, NextFunction } from 'express';
import { verifyPaymentSignature } from '../utils/signature';

interface PaymentDetails {
  price: string;
  currency: string;
  network: string;
  recipient: string;
  requiredHeaders: string[];
}

export const x402Middleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paymentProof = req.headers['x-payment-proof'] as string;
    const agentAddress = req.headers['x-agent-address'] as string;
    const assetId = req.params.id;

      const paymentDetails: PaymentDetails = {
        price: '0.50',
        currency: 'USDC',
        network: 'arbitrum-sepolia',
        recipient: process.env.PAYMENT_RECIPIENT || '0x1234567890123456789012345678901234567890',
        requiredHeaders: ['X-Payment-Proof', 'X-Agent-Address', 'X-Signature'],
      };

      res.status(402).json({
        error: 'Payment Required',
        message: 'This asset requires a micro-payment to access.',
        paymentDetails,
      });
      return;
    }

    // Verify the payment signature
    const signature = req.headers['x-signature'] as string;
    const isValid = await verifyPaymentSignature(
      signature,
      parseInt(assetId),
      agentAddress,
      process.env.AGENT_ADDRESS || '',
      BigInt(500000), // 0.50 USDC (6 decimals)
      0,
      Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
    );

      res.status(403).json({
        error: 'Invalid Payment',
        message: 'Payment signature verification failed.',
      });
      return;
    }

    console.log();
    next();
  } catch (error) {
    console.error('x402 middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Payment verification failed.',
    });
  }
};
