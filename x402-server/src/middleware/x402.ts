import { Request, Response, NextFunction } from 'express';
import { verifyPaymentSignature } from '../utils/signature';
import { checkAndIncrementNonce } from '../utils/nonceManager';
import logger from '../utils/logger';

export const x402Middleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paymentProof = req.headers['x-payment-proof'] as string;
    const agentAddress = req.headers['x-agent-address'] as string;
    const signature = req.headers['x-signature'] as string;
    const assetIdStr = req.params.id;

    if (!paymentProof || !agentAddress || !signature) {
      return res.status(402).json({
        error: 'Payment Required',
        message: 'This egocentric dataset requires a micro-payment to access.',
        paymentDetails: {
          price: '0.50',
          currency: 'USDC',
          network: 'robinhood-testnet',
          recipient: process.env.PAYMENT_RECIPIENT || '0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331',
          requiredHeaders: ['X-Payment-Proof', 'X-Agent-Address', 'X-Signature'],
        },
      });
    }

    const assetId = parseInt(assetIdStr, 10);
    const nonce = parseInt(paymentProof, 10) || 0;
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hora de validez
    const amount = 500000n; // 0.50 USDC (6 decimales)

    // 1. Verificar Nonce (Anti-replay)
    if (!checkAndIncrementNonce(agentAddress, nonce)) {
      return res.status(403).json({ error: 'Invalid or reused nonce' });
    }

    // 2. Verificar Firma Criptográfica
    const isValid = await verifyPaymentSignature(signature, assetId, agentAddress, agentAddress, amount, nonce, deadline);
    
    if (!isValid) {
      return res.status(403).json({ error: 'Invalid payment signature' });
    }

    logger.success('x402 Payment verified, granting access', { assetId, agentAddress });
    next();
  } catch (error) {
    logger.error('x402 middleware crash', error);
    res.status(500).json({ error: 'Internal server error during payment verification' });
  }
};
