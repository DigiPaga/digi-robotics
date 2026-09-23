import { Router, Request, Response } from 'express';
import { DataRequest } from '../types/data-flows';
import logger from '../utils/logger';

const router = Router();
const mockBounties: DataRequest[] = [];

// Obtener todas las solicitudes de datos abiertas
router.get('/', (req: Request, res: Response) => {
  const openBounties = mockBounties.filter(b => b.status === 'open');
  res.json({ success: true, count: openBounties.length, data: openBounties });
});

// Crear una nueva solicitud de datos (Bounty)
router.post('/', (req: Request, res: Response) => {
  try {
    const { requesterAddress, title, description, requiredTags, minQualityScore, bountyAmount } = req.body;

    if (!title || !bountyAmount || !requesterAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newBounty: DataRequest = {
      id: `bounty-${Date.now()}`,
      requesterAddress,
      title,
      description: description || '',
      requiredTags: requiredTags || [],
      minQualityScore: minQualityScore || 80,
      bountyAmount,
      status: 'open',
      createdAt: Date.now(),
    };

    mockBounties.push(newBounty);
    logger.success('New data bounty created', { id: newBounty.id, title });
    
    res.status(201).json({ success: true, data: newBounty });
  } catch (error) {
    logger.error('Failed to create bounty', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const bountyRouter = router;
