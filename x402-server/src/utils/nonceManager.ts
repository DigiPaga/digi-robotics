import logger from './logger';

// En producción, esto debería ser Redis. Para MVP, usamos un Map en memoria.
const nonceRegistry = new Map<string, number>();

export const checkAndIncrementNonce = (agentAddress: string, providedNonce: number): boolean => {
  const currentNonce = nonceRegistry.get(agentAddress.toLowerCase()) || 0;
  
  if (providedNonce !== currentNonce) {
    logger.warn('Invalid nonce detected', { agentAddress, providedNonce, currentNonce });
    return false;
  }
  
  // Incrementar el nonce para el siguiente uso
  nonceRegistry.set(agentAddress.toLowerCase(), currentNonce + 1);
  logger.info('Nonce validated and incremented', { agentAddress, newNonce: currentNonce + 1 });
  return true;
};

export const getCurrentNonce = (agentAddress: string): number => {
  return nonceRegistry.get(agentAddress.toLowerCase()) || 0;
};
