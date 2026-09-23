import { Router, Request, Response } from 'express';
import { x402Middleware } from '../middleware/x402';
import logger from '../utils/logger';

const router = Router();

// Mock de base de datos de assets egocéntricos
const mockAssets = new Map([
  ['1', { name: 'Rescue Ops Manual', type: 'pdf', ipfsHash: 'QmTest1', decryptionKey: '0xabc...123' }],
  ['2', { name: 'Hazmat Handling POV', type: 'video', ipfsHash: 'QmTest2', decryptionKey: '0xdef...456' }],
]);

// Endpoint que el frontend llama para iniciar el flujo de compra
router.post('/:id', x402Middleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = mockAssets.get(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Aquí iría la llamada real al smart contract via viem para ejecutar settlePayment
    logger.success('Smart contract settlement simulated', { assetId: id });

    // Entregar el activo (o la clave de desencriptación) solo después del pago verificado
    res.json({
      success: true,
      message: 'Payment settled on-chain. Asset unlocked.',
      data: {
        name: asset.name,
        ipfsGatewayUrl: `https://gateway.pinata.cloud/ipfs/${asset.ipfsHash}`,
        decryptionKey: asset.decryptionKey,
      },
    });
  } catch (error) {
    logger.error('Purchase orchestration failed', error);
    res.status(500).json({ error: 'Failed to process purchase' });
  }
});

export const purchaseRouter = router;
