import { Router, Request, Response } from 'express';

const router = Router();

const mockCatalog = [
  { id: 'asset-001', name: 'Rescue Ops Manual', price: '0.50 USDC', type: 'pdf', category: 'manuals', ipfsHash: 'QmTest1' },
  { id: 'asset-002', name: 'Hazmat Robot Blueprint', price: '1.20 USDC', type: 'cad', category: 'blueprints', ipfsHash: 'QmTest2' },
  { id: 'asset-003', name: 'AI Training Dataset', price: '2.00 USDC', type: 'json', category: 'datasets', ipfsHash: 'QmTest3' },
  { id: 'asset-004', name: 'Manufacturing Instructions', price: '0.75 USDC', type: 'pdf', category: 'manuals', ipfsHash: 'QmTest4' },
  { id: 'asset-005', name: 'Sensor Calibration Data', price: '1.50 USDC', type: 'csv', category: 'datasets', ipfsHash: 'QmTest5' },
];

router.get('/', (req: Request, res: Response) => {
  try {
    const { type, category, search, minPrice, maxPrice } = req.query;

    let filtered = mockCatalog;

    if (type) {
      filtered = filtered.filter(a => a.type === type);
    }

    if (category) {
      filtered = filtered.filter(a => a.category === category);
    }

    if (search) {
      const searchLower = (search as string).toLowerCase();
      filtered = filtered.filter(a => a.name.toLowerCase().includes(searchLower));
    }

    if (minPrice) {
      const min = parseFloat(minPrice as string);
      filtered = filtered.filter(a => parseFloat(a.price) >= min);
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice as string);
      filtered = filtered.filter(a => parseFloat(a.price) <= max);
    }

    res.json({
      success: true,
      assets: filtered,
      total: filtered.length,
      filters: { type, category, search, minPrice, maxPrice },
    });
  } catch (error) {
    console.error('Catalog error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch catalog.',
    });
  }
});

router.get('/categories', (req: Request, res: Response) => {
  const categories = [...new Set(mockCatalog.map(a => a.category))];
  res.json({
    success: true,
    categories,
  });
});

router.get('/types', (req: Request, res: Response) => {
  const types = [...new Set(mockCatalog.map(a => a.type))];
  res.json({
    success: true,
    types,
  });
});

export const catalogRouter = router;
