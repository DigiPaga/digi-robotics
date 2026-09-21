import { Router, Request, Response } from 'express';
import { x402Middleware } from '../middleware/x402';
import { getFromIPFS } from '../utils/ipfs';

const router = Router();

// Mock catalog for demo
const mockCatalog = [
  { id: 'asset-001', name: 'Rescue Ops Manual', price: '0.50 USDC', type: 'pdf', ipfsHash: 'QmTest1' },
  { id: 'asset-002', name: 'Hazmat Robot Blueprint', price: '1.20 USDC', type: 'cad', ipfsHash: 'QmTest2' },
  { id: 'asset-003', name: 'AI Training Dataset', price: '2.00 USDC', type: 'json', ipfsHash: 'QmTest3' },
];

// Public catalog endpoint
router.get('/catalog', (req: Request, res: Response) => {
  res.json({
    success: true,
    assets: mockCatalog,
    total: mockCatalog.length,
  });
});

// Protected asset endpoint (requires x402 payment)
router.get('/:id', x402Middleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = mockCatalog.find(a => a.id === id);

      res.status(404).json({
        error: 'Asset Not Found',
        message: ,
      });
      return;
    }

    // Fetch asset from IPFS
    const assetData = await getFromIPFS(asset.ipfsHash);

    res.json({
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
        type: asset.type,
      },
      data: assetData,
      message: 'Asset successfully retrieved after payment verification.',
    });
  } catch (error) {
    console.error('Asset retrieval error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve asset.',
    });
  }
});

// Asset metadata endpoint (public)
router.get('/:id/metadata', (req: Request, res: Response) => {
  const { id } = req.params;
  const asset = mockCatalog.find(a => a.id === id);

    res.status(404).json({ error: 'Asset Not Found' });
    return;
  }

  res.json({
    success: true,
    metadata: {
      id: asset.id,
      name: asset.name,
      price: asset.price,
      type: asset.type,
      ipfsHash: asset.ipfsHash,
    },
  });
});

export const assetRouter = router;
