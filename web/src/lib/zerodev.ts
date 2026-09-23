import { createKernelAccountClient } from '@zerodev/sdk';
import { createWalletClient, http, custom } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';

// Tu Project ID real de ZeroDev
const ZERODEV_PROJECT_ID = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || '7bab70e2-263a-4961-aef7-6229e1d37f10';

/**
 * Inicializa el cliente de ZeroDev (Kernel Account)
 * Esto crea una Smart Account (ERC-4337) lista para usar Session Keys y Paymasters.
 */
export const createZeroDevClient = async (provider: any) => {
  try {
    // 1. Crear wallet client estándar (MetaMask / Rabby)
    const walletClient = createWalletClient({
      chain: arbitrumSepolia,
      transport: custom(provider),
    });

    // 2. Convertir el signer en un validador ECDSA de ZeroDev
    const ecdsaValidator = await signerToEcdsaValidator(walletClient);

    // 3. Crear el Kernel Account Client (la Smart Account)
    const kernelClient = await createKernelAccountClient({
      projectId: ZERODEV_PROJECT_ID,
      chain: arbitrumSepolia,
      transport: http(),
      validator: ecdsaValidator,
      // Opcional: Aquí se configuraría el Paymaster para transacciones sin gas
      // paymaster: true, 
    });

    return kernelClient;
  } catch (error) {
    console.error('Failed to initialize ZeroDev client:', error);
    throw error;
  }
};

/**
 * Direcciones de contratos para referencia en el frontend
 */
export const CONTRACT_ADDRESSES = {
  arbitrumSepolia: {
    agentRegistry: '0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331',
    marketplace: '0xFd6F3e01c60870a8978665fF2EE872861590bEc3',
    usdc: '0x75faF114eAfb1bDbE4F43213fE49d7C47Aa714b3',
  },
  robinhoodTestnet: {
    agentRegistry: '0x7Fdf0074C6e40c5B4ABDaBcE8397DaE284194331',
    marketplace: '0xFd6F3e01c60870a8978665fF2EE872861590bEc3',
  }
} as const;
