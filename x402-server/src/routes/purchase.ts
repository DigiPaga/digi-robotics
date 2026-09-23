import { Router, Request, Response } from 'express';
import { x402Middleware } from '../middleware/x402';
import { reputationService } from '../services/reputation';
import { dynamicPricingService } from '../services/dynamic-pricing';
import logger from '../utils/logger';

const router = Router();

const mockAssets = new Map([
  ['1', { name: 'Rescue Ops Manual', type: 'pdf', tags: ['industrial', 'soldering'], basePrice: 0.50, ipfsHash: 'QmTest1', decryptionKey: '0xabc...123' }],
  ['2', { name: 'Hazmat Handling POV', type: 'video', tags: ['industrial', 'low-light'], basePrice: 1.50, ipfsHash: 'QmTest2', decryptionKey: '0xdef...456' }],
]);

router.post('/:id', x402Middleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agentAddress = req.headers['x-agent-address'] as string;
    const asset = mockAssets.get(id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // 1. Verificar Reputación del Agente
    if (!reputationService.isTrusted(agentAddress, 70)) {
      return res.status(403).json({ 
        error: 'Agent reputation too low', 
        message: 'Autonomous agents must maintain a trust score > 70 to purchase.' 
      });
    }

    // 2. Calcular Precio Dinámico
    const finalPrice = dynamicPricingService.calculatePrice(asset.tags, asset.basePrice);

    // 3. Simular Liquidación On-Chain (Smart Contract)
    logger.success('Smart contract settlement simulated', { assetId: id, finalPrice, agent: agentAddress });

    // 4. Actualizar Reputación por transacción exitosa
    reputationService.recordTransaction(agentAddress, true);

    res.json({
      success: true,
      message: 'Payment settled. Dynamic pricing applied.',
      data: {
        name: asset.name,
        finalPricePaid: `${finalPrice} USDC`,
        ipfsGatewayUrl: `https://gateway.pinata.cloud/ipfs/${asset.ipfsHash}`,
        decryptionKey: asset.decryptionKey,
        newAgentTrustScore: reputationService.getScore(agentAddress),
      },
    });
  } catch (error) {
    logger.error('Purchase orchestration failed', error);
    res.status(500).json({ error: 'Failed to process purchase' });
  }
});

export const purchaseRouter = router;
