import { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router = Router();

/**
 * Hardware Marketplace API
 * Allows users and agents to discover recommended equipment for egocentric data collection.
 */

const mockHardwareCatalog = [
  {
    id: 'hw-001',
    name: 'Pro Egocentric Chest Mount',
    category: 'mount',
    description: 'Stable, vibration-dampening chest harness for industrial and warehouse data collection.',
    priceUSDC: '25.00',
    compatibility: ['smartphone', 'action-camera'],
    inStock: true,
  },
  {
    id: 'hw-002',
    name: 'Fine-Motor Head Strap',
    category: 'head-mount',
    description: 'Lightweight head strap with adjustable phone holder. Keeps hands and workspace in frame for fine-motor tasks.',
    priceUSDC: '18.50',
    compatibility: ['smartphone'],
    inStock: true,
  },
  {
    id: 'hw-003',
    name: 'Smartphone Neck Holder (Lazy Bracket)',
    category: 'neck-mount',
    description: 'Flexible gooseneck neck mount for casual, hands-free recording. Best for household and cooking datasets.',
    priceUSDC: '12.00',
    compatibility: ['smartphone'],
    inStock: true,
  },
  {
    id: 'hw-004',
    name: 'Portable Phone Gimbal Stabilizer',
    category: 'stabilizer',
    description: '3-axis gimbal for ultra-smooth locomotion data. Required for advanced humanoid walking/running datasets.',
    priceUSDC: '85.00',
    compatibility: ['smartphone', 'action-camera'],
    inStock: false,
  }
];

// Get all hardware
router.get('/', (req: Request, res: Response) => {
  const { category, inStock } = req.query;
  let filtered = mockHardwareCatalog;

  if (category) filtered = filtered.filter(h => h.category === category);
  if (inStock === 'true') filtered = filtered.filter(h => h.inStock);

  res.json({ success: true, count: filtered.length, data: filtered });
});

// Get specific hardware item
router.get('/:id', (req: Request, res: Response) => {
  const item = mockHardwareCatalog.find(h => h.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Hardware item not found' });
  
  res.json({ success: true, data: item });
});

export const hardwareRouter = router;
