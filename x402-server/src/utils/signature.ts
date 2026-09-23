import { verifyTypedData, Address } from 'viem';
import logger from './logger';

const EIP712_DOMAIN = {
  name: 'DigiRobotics Marketplace',
  version: '1',
  chainId: 46630, // Robinhood Testnet
};

const PAYMENT_TYPES = {
  Payment: [
    { name: 'assetId', type: 'uint256' },
    { name: 'buyer', type: 'address' },
    { name: 'agent', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export const verifyPaymentSignature = async (
  signature: string,
  assetId: number,
  buyer: string,
  agent: string,
  amount: bigint,
  nonce: number,
  deadline: number
): Promise<boolean> => {
  try {
    const isValid = await verifyTypedData({
      address: buyer as Address,
      domain: EIP712_DOMAIN,
      types: PAYMENT_TYPES,
      primaryType: 'Payment',
      message: {
        assetId: BigInt(assetId),
        buyer: buyer as Address,
        agent: agent as Address,
        amount,
        nonce: BigInt(nonce),
        deadline: BigInt(deadline),
      },
      signature: signature as `0x${string}`,
    });
    
    logger.info('Signature verified successfully', { buyer, assetId, isValid });
    return isValid;
  } catch (error) {
    logger.error('Signature verification failed', { error, buyer, assetId });
    return false;
  }
};
