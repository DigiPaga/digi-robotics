import { verifyTypedData } from 'viem';

const EIP712_DOMAIN = {
  name: 'DigiPaga Marketplace',
  version: '1',
  chainId: 421614, // Arbitrum Sepolia
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
    const valid = await verifyTypedData({
      address: buyer as ,
      domain: EIP712_DOMAIN,
      types: PAYMENT_TYPES,
      primaryType: 'Payment',
      message: {
        assetId: BigInt(assetId),
        buyer: buyer as ,
        agent: agent as ,
        amount,
        nonce: BigInt(nonce),
        deadline: BigInt(deadline),
      },
      signature: signature as ,
    });
    return valid;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};

export const generatePaymentHash = (
  assetId: number,
  buyer: string,
  amount: bigint
): string => {
  return ;
};
