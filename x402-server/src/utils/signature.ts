import { verifyTypedData, Address, verifyMessage } from 'viem';
import logger from './logger';

const EIP712_DOMAIN = {
  name: 'DigiRobotics Marketplace',
  version: '1',
  chainId: 46630, // Robinhood Testnet (o 421614 para Arbitrum Sepolia)
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

/**
 * Verifica firmas EIP-712.
 * Compatible tanto con EOA (MetaMask) como con Smart Accounts (ZeroDev) 
 * gracias a que viem maneja automáticamente la validación EIP-1271 si la dirección es un contrato.
 */
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
      address: buyer as Address, // Si es Smart Account, viem usa EIP-1271 automáticamente
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
    
    logger.info('Signature verified successfully (EIP-712 / EIP-1271)', { buyer, assetId, isValid });
    return isValid;
  } catch (error) {
    logger.error('Signature verification failed', { error, buyer, assetId });
    return false;
  }
};
